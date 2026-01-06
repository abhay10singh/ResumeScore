import re
import asyncio
from typing import List, Optional
import aiohttp
from bs4 import BeautifulSoup

def extract_urls(text: str) -> List[str]:
    """
    Extract relevant URLs from resume text.
    Filters to only include professional/portfolio links.    
    Args:
        text: Resume text to scan for URLs    
    Returns:
        List of up to 5 relevant URLs
    """
    url_pattern = r'https?://[^\s<>"{}|\\^`\[\]()\']*[^\s<>"{}|\\^`\[\]()\',.]'
    matches = re.findall(url_pattern, text, re.IGNORECASE)    

    relevant_domains = [
        'github.com',
        'gitlab.com',
        'bitbucket.org',
        'linkedin.com',
        'stackoverflow.com',
        'medium.com',
        'dev.to',
        'hashnode.com',
        'behance.net',
        'dribbble.com',
        'kaggle.com',
        'huggingface.co',
    ]

    personal_tlds = ['.io', '.dev', '.me', '.tech', '.app', '.xyz', '.site', '.co']    
    relevant_urls = []
    seen = set()    
    for url in matches:
        url = url.rstrip('.,;:!?)')
        url_lower = url.lower()        
        # Skip if already seen
        if url_lower in seen:
            continue
        seen.add(url_lower)        
        is_relevant = False                        
        for domain in relevant_domains:
            if domain in url_lower:
                is_relevant = True
                break
        if not is_relevant:
            if any(tld in url_lower for tld in personal_tlds):
                is_relevant = True
            elif 'portfolio' in url_lower or 'personal' in url_lower:
                is_relevant = True        
        if is_relevant:
            relevant_urls.append(url)        
        if len(relevant_urls) >= 5:
            break   
    return relevant_urls
async def fetch_single_url(
    session: aiohttp.ClientSession,
    url: str,
    timeout: int = 10
) -> Optional[str]:
    """
    Fetch and extract meaningful text from a single URL.    
    Args:
        session: aiohttp session to use
        url: URL to fetch
        timeout: Request timeout in seconds   
    Returns:
        Extracted text content or None if failed
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; ResumeScoreBot/1.0; +https://resumescore.app)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }        
        async with session.get(
            url,
            timeout=aiohttp.ClientTimeout(total=timeout),
            headers=headers,
            allow_redirects=True,
            ssl=False
        ) as response:            
            if response.status != 200:
                print(f"URL {url} returned status {response.status}")
                return None            
            content_type = response.headers.get('Content-Type', '')
            if 'html' not in content_type.lower() and 'text' not in content_type.lower():
                print(f"URL {url} is not HTML/text: {content_type}")
                return None            
            html = await response.text()                       
            soup = BeautifulSoup(html, 'html.parser')            
            for tag in soup(['script', 'style', 'nav', 'footer', 'header', 
                           'aside', 'form', 'button', 'iframe', 'noscript']):
                tag.decompose()
            main_content = None            
            if 'github.com' in url:
                main_content = _parse_github(soup, url)    
            elif 'linkedin.com' in url:
                main_content = _parse_linkedin(soup)            
            if not main_content:
                main_content = _parse_generic(soup)            
            if main_content:
                content = main_content[:3000]
                return f"\n--- Content from {url} ---\n{content}"            
            return None            
    except asyncio.TimeoutError:
        print(f"Timeout fetching {url}")
        return None
    except Exception as e:
        print(f"Failed to fetch {url}: {type(e).__name__}: {e}")
        return None
def _parse_github(soup: BeautifulSoup, url: str) -> Optional[str]:
    """Parse GitHub profile or repository page."""
    content_parts = []    
    if '/github.com/' in url and url.count('/') <= 4:
        # Bio
        bio = soup.find('div', class_='p-note')
        if bio:
            content_parts.append(f"Bio: {bio.get_text(strip=True)}")
        pinned = soup.find_all('span', class_='repo')
        if pinned:
            repos = [r.get_text(strip=True) for r in pinned[:6]]
            content_parts.append(f"Pinned Repositories: {', '.join(repos)}")
        stats = soup.find_all('span', class_='Counter')
        if stats:
            content_parts.append(f"Activity stats found")
    else:
        readme = soup.find('article', class_='markdown-body')
        if readme:
            content_parts.append(f"README:\n{readme.get_text(separator=' ', strip=True)[:2000]}")

        about = soup.find('p', class_='f4')
        if about:
            content_parts.append(f"Description: {about.get_text(strip=True)}")

        topics = soup.find_all('a', class_='topic-tag')
        if topics:
            topic_list = [t.get_text(strip=True) for t in topics[:10]]
            content_parts.append(f"Topics: {', '.join(topic_list)}")
    
    return '\n'.join(content_parts) if content_parts else None
def _parse_linkedin(soup: BeautifulSoup) -> Optional[str]:
    """Parse LinkedIn profile page (limited due to auth walls)."""
    content_parts = []
    main = soup.find('main') or soup.find('body')
    if main:
        text = main.get_text(separator=' ', strip=True)
        # LinkedIn often requires login, so content may be limited
        if len(text) > 100:
            content_parts.append(text[:1500])
    
    return '\n'.join(content_parts) if content_parts else None
def _parse_generic(soup: BeautifulSoup) -> Optional[str]:
    """Generic parsing for portfolio/personal sites."""
    content_parts = []
    main = (
        soup.find('main') or 
        soup.find('article') or 
        soup.find('div', class_=re.compile(r'content|main|body', re.I)) or
        soup.find('body')
    )   
    if main:
        for tag in main.find_all(['h1', 'h2', 'h3', 'p', 'li']):
            text = tag.get_text(strip=True)
            if text and len(text) > 10:
                content_parts.append(text)
    
    return '\n'.join(content_parts[:50]) if content_parts else None
async def fetch_external_content(urls: List[str]) -> str:
    """
    Fetch content from multiple URLs in parallel.    
    Args:
        urls: List of URLs to fetch    
    Returns:
        Combined text content from all successful fetches
    """
    if not urls:
        return ""    
    print(f"Fetching content from {len(urls)} URLs...")    
    connector = aiohttp.TCPConnector(limit=5, limit_per_host=2)   
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [fetch_single_url(session, url) for url in urls]
        results = await asyncio.gather(*tasks, return_exceptions=True)
    valid_results = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            print(f"URL {urls[i]} raised exception: {result}")
        elif result:
            valid_results.append(result)
    
    combined = "\n\n".join(valid_results)
    print(f"Successfully fetched content from {len(valid_results)}/{len(urls)} URLs")    
    return combined

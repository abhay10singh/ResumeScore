import UploadForm from "@/components/UploadForm";
import { Heart } from "lucide-react";
import ResumeScoreExact from "@/components/ResumeScoreExact";

export default function Home() {
  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-white">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>

      <main className="relative min-h-screen flex flex-col items-center justify-center p-24 overflow-auto">
        <div className="z-20 max-w-5xl w-full font-mono">

          
          <div className="flex flex-col items-center mb-12">
            <ResumeScoreExact />

            <div className="flex flex-col items-center mt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Made with</span>
                <Heart className="h-4 w-4 text-rose-500" />
                <span>by Abhay</span>
              </div>
              <p className="text-lg mt-2">Upload your resume to get started</p>
            </div>
          </div>

          <UploadForm />
        </div>
      </main>
    </>
  );
}
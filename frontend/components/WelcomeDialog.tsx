import React from "react";
import {
  FolderOpen,
  Upload,
  Eye,
  CheckCircle,
  FolderPlus,
  X,
  Search,
  Box,
} from "lucide-react";
import { APP_NAME } from "../contexts/constants";

interface WelcomeDialogProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    icon: <Search className="w-6 h-6 text-blue-400" />,
    title: "Search for projects",
    description: 
      "Browse military projects and files that have been uploaded by other military users.",
  },
  {
    icon: <Upload className="w-6 h-6 text-green-400" />,
    title: "Upload your models",
    description:
      "Upload STL or STEP files into a dedicated project folder. Avoid uploading files to the root — give every model a home.",
  },
  {
    icon: <Eye className="w-6 h-6 text-purple-400" />,
    title: "Preview & annotate",
    description:
      "Click any model to open the 3D viewer. Add a description, tags, and metadata to help others find and understand your files.",
  },
  {
    icon: <CheckCircle className="w-6 h-6 text-amber-400" />,
    title: "Admin review",
    description:
      "Uploads are reviewed before appearing in the shared vault. You can track your pending submissions in My Dashboard.",
  },
];

const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-vault-800 border border-vault-600 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 ">
              <Box className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Welcome to {APP_NAME.short}
              </h2>
              <p className="text-sm text-slate-400 mt-0.5">
                Here's how to get started
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white transition-colors mt-0.5"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 pb-4 flex flex-col gap-4">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3">
              <div className="flex items-start justify-center">
                <div className="p-2 bg-vault-700/60 rounded-lg">
                  {step.icon}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{step.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Tip banner */}
        <div className="mx-6 mb-6 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex gap-2">
          <FolderPlus className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-300 leading-relaxed">
            <span className="font-semibold">Tip:</span> Always upload files into
            their own project folder. A well-named folder makes it much easier
            for your team to find models later.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            Get started
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeDialog;

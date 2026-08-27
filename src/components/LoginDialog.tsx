import React from "react";
import { LogIn, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type LoginDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoogleSignIn: () => void;
};

export default function LoginDialog({ open, onOpenChange, onGoogleSignIn }: LoginDialogProps) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="login-dialog">
      <DialogHeader>
        <p className="eyebrow">Your Soundwave library</p>
        <DialogTitle>Sign in to save your sound</DialogTitle>
        <DialogDescription>Use your Google account to keep likes and playlists with you.</DialogDescription>
      </DialogHeader>
      <button className="google-sign-in-button" onClick={onGoogleSignIn}>
        <span className="google-sign-in-button__mark" aria-hidden="true">G</span>
        Continue with Google
        <LogIn size={17} />
      </button>
      <div className="login-dialog__divider"><span>More sign-in options</span></div>
      <div className="otp-unavailable" aria-label="Email code sign-in is not available yet">
        <Mail size={18} />
        <div><strong>Email code sign-in is coming soon</strong><p>It will be enabled once Soundwave has a verified email-sending domain.</p></div>
      </div>
    </DialogContent>
  </Dialog>;
}

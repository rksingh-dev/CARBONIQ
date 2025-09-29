import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { GoogleSignIn } from './GoogleSignIn';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const handleSuccess = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            Welcome to CarbonNN
          </DialogTitle>
        </DialogHeader>
        
        <GoogleSignIn 
          onSuccess={handleSuccess}
          title="Sign In with Google"
          description="Access your Blue Carbon Token dashboard"
          buttonText="Continue with Google"
        />
      </DialogContent>
    </Dialog>
  );
}

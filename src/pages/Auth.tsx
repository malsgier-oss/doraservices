import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { MapPin, Mail, Lock, User, Loader2, Building2 } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const nameSchema = z.string().min(2, "Name must be at least 2 characters");

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({ email: "", password: "", fullName: "", isBusiness: false });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const emailResult = emailSchema.safeParse(loginData.email);
    if (!emailResult.success) {
      toast({ title: "Invalid email", description: emailResult.error.errors[0].message, variant: "destructive" });
      return;
    }
    
    const passwordResult = passwordSchema.safeParse(loginData.password);
    if (!passwordResult.success) {
      toast({ title: "Invalid password", description: passwordResult.error.errors[0].message, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setIsLoading(false);

    if (error) {
      let message = error.message;
      if (message.includes("Invalid login credentials")) {
        message = "Invalid email or password. Please try again.";
      }
      toast({ title: "Login failed", description: message, variant: "destructive" });
    } else {
      toast({ title: "Welcome back!", description: "You've successfully logged in." });
      navigate("/");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const nameResult = nameSchema.safeParse(signupData.fullName);
    if (!nameResult.success) {
      toast({ title: "Invalid name", description: nameResult.error.errors[0].message, variant: "destructive" });
      return;
    }
    
    const emailResult = emailSchema.safeParse(signupData.email);
    if (!emailResult.success) {
      toast({ title: "Invalid email", description: emailResult.error.errors[0].message, variant: "destructive" });
      return;
    }
    
    const passwordResult = passwordSchema.safeParse(signupData.password);
    if (!passwordResult.success) {
      toast({ title: "Invalid password", description: passwordResult.error.errors[0].message, variant: "destructive" });
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupData.email, signupData.password, signupData.fullName);

    if (error) {
      setIsLoading(false);
      let message = error.message;
      if (message.includes("already registered")) {
        message = "This email is already registered. Please log in instead.";
      }
      toast({ title: "Signup failed", description: message, variant: "destructive" });
      return;
    }

    // If registering as business, add business role
    if (signupData.isBusiness) {
      // Wait for the user to be created and trigger to run
      let attempts = 0;
      let user = null;
      
      while (attempts < 5 && !user) {
        await new Promise(resolve => setTimeout(resolve, 300));
        const { data } = await supabase.auth.getUser();
        user = data.user;
        attempts++;
      }
      
      if (user) {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: user.id, role: "business" });
        
        if (roleError) {
          console.error("Failed to add business role:", roleError);
        }
      }
    }

    setIsLoading(false);
    toast({ 
      title: "Account created!", 
      description: signupData.isBusiness ? "Welcome! Set up your business dashboard." : "Welcome to LocalSpot!" 
    });
    navigate(signupData.isBusiness ? "/dashboard" : "/community");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex flex-col items-center justify-center p-4">
      {/* Logo/Brand */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-10 gradient-warm rounded-xl flex items-center justify-center">
          <MapPin className="w-6 h-6 text-primary-foreground" />
        </div>
        <span className="text-2xl font-display font-bold text-foreground">LocalSpot</span>
      </div>

      <Card className="w-full max-w-md shadow-card">
        <Tabs defaultValue="login" className="w-full">
          <CardHeader className="pb-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent className="pt-4">
            {/* Login Tab */}
            <TabsContent value="login" className="mt-0">
              <div className="space-y-1 mb-6">
                <CardTitle className="text-xl">Welcome back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
              </div>
              
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Logging in...
                    </>
                  ) : (
                    "Log In"
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Signup Tab */}
            <TabsContent value="signup" className="mt-0">
              <div className="space-y-1 mb-6">
                <CardTitle className="text-xl">Create an account</CardTitle>
                <CardDescription>Join LocalSpot to discover local businesses</CardDescription>
              </div>
              
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      className="pl-10"
                      value={signupData.fullName}
                      onChange={(e) => setSignupData({ ...signupData, fullName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      className="pl-10"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Business Registration Toggle */}
                <div className="flex items-center space-x-3 p-4 rounded-lg bg-secondary/50 border border-border">
                  <Checkbox
                    id="is-business"
                    checked={signupData.isBusiness}
                    onCheckedChange={(checked) => 
                      setSignupData({ ...signupData, isBusiness: checked === true })
                    }
                  />
                  <div className="flex-1">
                    <Label htmlFor="is-business" className="flex items-center gap-2 cursor-pointer">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-medium">I'm registering as a business</span>
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Get access to the business dashboard to manage deals & promotions
                    </p>
                  </div>
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    signupData.isBusiness ? "Create Business Account" : "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground text-center">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  );
}

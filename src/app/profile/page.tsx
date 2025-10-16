'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarUser } from '@/components/ui/avatar';
import {
  User,
  Camera,
  Check,
  X,
  RefreshCw,
  Settings,
  Globe,
  Upload,
  Palette,
  Loader2,
} from 'lucide-react';
import {
  getCurrentUserProfile,
  updateUserProfile,
  checkUsernameAvailability,
  getUsernameSuggestions,
  generateUserUsername,
  uploadProfilePicture,
} from '@/app/actions/profile.actions';
import { cn } from '@/lib/utils';
import { validateUsername } from '@/lib/username-generator';
import { Separator } from '@/components/ui/separator';
import { LoadingStates } from '@/components/ui/loading-state';

interface ProfileData {
  id: string;
  name: string | null;
  email: string | null;
  username: string | null;
  avatarType: string;
  profilePicture: string | null;
  gravatarEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    avatarType: 'INITIALS',
    gravatarEmail: '',
  });
  
  // Username validation state
  const [usernameCheck, setUsernameCheck] = useState<{
    isChecking: boolean;
    isAvailable: boolean | null;
    message: string;
  }>({
    isChecking: false,
    isAvailable: null,
    message: '',
  });
  
  // Username suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [status, router]);

  // Load profile data
  const loadProfile = useCallback(async () => {
    if (!session?.user?.email) return;
    
    try {
      const profileResult = await getCurrentUserProfile();
      
      if (profileResult.success && profileResult.user) {
        const profileData = profileResult.user;
        setProfile(profileData);
        setFormData({
          username: profileData.username || '',
          
          avatarType: profileData.avatarType,
          gravatarEmail: profileData.gravatarEmail || '',
        });
      }
      
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Check for changes
  useEffect(() => {
    if (!profile) return;
    
    const hasChanged = 
      formData.username !== (profile.username || '') ||
      
      formData.avatarType !== profile.avatarType ||
      formData.gravatarEmail !== (profile.gravatarEmail || '');
    
    setHasChanges(hasChanged);
  }, [formData, profile]);

  // Username availability check
  const checkUsername = useCallback(async (username: string) => {
    if (!username || username === (profile?.username || '')) {
      setUsernameCheck({ isChecking: false, isAvailable: null, message: '' });
      return;
    }
    
    const validation = validateUsername(username);
    if (!validation.valid) {
      setUsernameCheck({
        isChecking: false,
        isAvailable: false,
        message: validation.error || 'Invalid username',
      });
      return;
    }
    
    setUsernameCheck({ isChecking: true, isAvailable: null, message: 'Checking...' });
    
    try {
      const result = await checkUsernameAvailability(username);
      if (result.success) {
        setUsernameCheck({
          isChecking: false,
          isAvailable: result.available || null,
          message: result.message || '',
        });
      } else {
        setUsernameCheck({
          isChecking: false,
          isAvailable: false,
          message: result.error || 'Error checking username',
        });
      }
    } catch {
      setUsernameCheck({
        isChecking: false,
        isAvailable: false,
        message: 'Error checking username',
      });
    }
  }, [profile?.username]);

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.username) {
        checkUsername(formData.username);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [formData.username, checkUsername]);

  // Load username suggestions
  const loadSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const result = await getUsernameSuggestions(5);
      if (result.success) {
        setSuggestions(result.suggestions || []);
      }
    } catch (error) {
      console.error('Error loading suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Generate random username
  const generateUsername = async () => {
    try {
      const result = await generateUserUsername();
      if (result.success && result.username) {
        setFormData(prev => ({ ...prev, username: result.username }));
      }
    } catch (error) {
      console.error('Error generating username:', error);
    }
  };

  // Save profile
  const handleSave = async () => {
    if (!hasChanges) return;
    
    setSaving(true);
    try {
      const result = await updateUserProfile({
        username: formData.username || undefined,
        avatarType: formData.avatarType as 'INITIALS' | 'GRAVATAR' | 'UPLOAD',
        gravatarEmail: formData.gravatarEmail || undefined,
      });
      
      if (result.success) {
        await loadProfile(); // Reload profile data
        setHasChanges(false);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error saving profile');
    } finally {
      setSaving(false);
    }
  };

  // Handle avatar type change
  const handleAvatarTypeChange = async (avatarType: string) => {
    setFormData(prev => ({ ...prev, avatarType }));

    if (avatarType !== 'GRAVATAR') {
      setFormData(prev => ({ ...prev, gravatarEmail: '' }));
    }
  };


  // Enhanced save function with upload handling
  const handleSaveWithUpload = async () => {
    setSaving(true);
    
    try {
      // First, handle file upload if there's a new file
      if (uploadedFile) {
        setIsUploading(true);
        const uploadFormData = new FormData();
        uploadFormData.append('file', uploadedFile);
        
        const uploadResult = await uploadProfilePicture(uploadFormData);
        if (!uploadResult.success) {
          console.error('Failed to upload profile picture:', uploadResult.error);
          setIsUploading(false);
          setSaving(false);
          return;
        }
        
        setUploadedFile(null);
        setIsUploading(false);
      }
      
      // Then update other profile data
      await handleSave();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return <LoadingStates.DetailPage />;
  }

  if (!session?.user) {
    return null;
  }

  const avatarUser: AvatarUser = profile ? {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    username: profile.username,
    avatarType: formData.avatarType,
    profilePicture: profile.profilePicture,
    gravatarEmail: formData.gravatarEmail || profile.gravatarEmail,
  } : {
    id: session.user.email || 'unknown',
    name: session.user.name,
    email: session.user.email,
    username: null,
    avatarType: 'INITIALS',
    profilePicture: null,
    gravatarEmail: null,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your profile and account preferences</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button 
              onClick={handleSave} 
              disabled={isSaving || usernameCheck.isChecking || !usernameCheck.isAvailable}
              className="bg-gradient-to-r from-[#6379c3] to-[#546ee5] text-white hover:opacity-90"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Picture */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-semibold text-foreground">
                <Camera className="w-5 h-5 text-[#546ee5]" />
                Profile Picture
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Avatar user={avatarUser} size="2xl" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="initials"
                    name="avatarType"
                    checked={formData.avatarType === 'INITIALS'}
                    onChange={() => handleAvatarTypeChange('INITIALS')}
                    className="text-[#007DB8]"
                  />
                  <Label htmlFor="initials" className="flex items-center gap-2 cursor-pointer">
                    <Palette className="w-4 h-4" />
                    Initials
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="gravatar"
                    name="avatarType"
                    checked={formData.avatarType === 'GRAVATAR'}
                    onChange={() => handleAvatarTypeChange('GRAVATAR')}
                    className="text-[#007DB8]"
                  />
                  <Label htmlFor="gravatar" className="flex items-center gap-2 cursor-pointer">
                    <Globe className="w-4 h-4" />
                    Gravatar
                  </Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="upload"
                    name="avatarType"
                    checked={formData.avatarType === 'UPLOAD'}
                    onChange={() => handleAvatarTypeChange('UPLOAD')}
                    className="text-[#007DB8]"
                  />
                  <Label htmlFor="upload" className="flex items-center gap-2 cursor-pointer">
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </Label>
                </div>
              </div>
              
              {formData.avatarType === 'GRAVATAR' && (
                <div className="space-y-2">
                  <Label htmlFor="gravatarEmail">Gravatar Email</Label>
                  <Input
                    id="gravatarEmail"
                    type="email"
                    value={formData.gravatarEmail}
                    onChange={(e) => setFormData(prev => ({ ...prev, gravatarEmail: e.target.value }))}
                    placeholder="Enter email for Gravatar"
                  />
                </div>
              )}
              
              {formData.avatarType === 'UPLOAD' && (
                <div className="space-y-2">
                  <Button variant="outline" className="w-full" disabled>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image (Coming Soon)
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Image upload functionality will be available soon
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Information */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-semibold text-foreground">
                <User className="w-5 h-5 text-[#546ee5]" />
                Profile Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Information */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profile?.name || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your display name is managed by your authentication provider
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your email address cannot be changed
                  </p>
                </div>
              </div>

              <Separator />

              {/* Username */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <Input
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Enter a unique username"
                      className={cn(
                        usernameCheck.isAvailable === false && 'border-red-500 focus:border-red-500',
                        usernameCheck.isAvailable === true && 'border-green-500 focus:border-green-500'
                      )}
                    />
                    {usernameCheck.isChecking && (
                      <RefreshCw className="absolute right-3 top-3 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                    {!usernameCheck.isChecking && usernameCheck.isAvailable === true && (
                      <Check className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                    )}
                    {!usernameCheck.isChecking && usernameCheck.isAvailable === false && (
                      <X className="absolute right-3 top-3 w-4 h-4 text-red-500" />
                    )}
                  </div>
                  {usernameCheck.message && (
                    <p className={cn(
                      "text-xs",
                      usernameCheck.isAvailable === false ? "text-red-600" : "text-green-600"
                    )}>
                      {usernameCheck.message}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={generateUsername}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Generate Random
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={loadSuggestions}
                    disabled={isLoadingSuggestions}
                    className="flex-1"
                  >
                    {isLoadingSuggestions ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Settings className="w-4 h-4 mr-2" />
                    )}
                    Get Suggestions
                  </Button>
                </div>
                
                {suggestions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Suggestions:</Label>
                    <div className="flex flex-wrap gap-2">
                      {suggestions.map((suggestion) => (
                        <Badge
                          key={suggestion}
                          variant="secondary"
                          className="cursor-pointer hover:bg-gradient-to-r hover:from-[#6379c3] hover:to-[#546ee5] hover:text-white"
                          onClick={() => setFormData(prev => ({ ...prev, username: suggestion }))}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>


              {/* Save Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveWithUpload}
                  disabled={isSaving || isUploading || !hasChanges}
                  className="w-full bg-gradient-to-r from-[#6379c3] to-[#546ee5] text-white hover:opacity-90"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
    </div>
  );
}
import { useState, useEffect, useRef } from 'react';
import { Camera, Edit2, Plus, Trash2, X, MapPin, Briefcase, GraduationCap, Award, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Experience {
  id: string;
  position: string;
  company: string;
  start_date: string | null;
  end_date: string | null;
  description?: string;
  is_current?: boolean;
  user_id: string;
}

interface Education {
  id: string;
  school: string;
  degree: string;
  field_of_study: string | null;
  start_date: string | null;
  end_date: string | null;
  user_id: string;
}

interface Skill {
  id: string;
  skill_name: string;
  endorsements?: number;
  user_id: string;
}

interface Certificate {
  id: string;
  certificate_name: string;
  issuing_organization: string;
  issue_date: string | null;
  expiry_date: string | null;
  credential_id?: string;
  credential_url?: string;
  description?: string;
  user_id: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  username?: string;
  headline?: string;
  bio?: string;
  profile_image_url?: string;
  cover_image_url?: string;
  location?: string;
  website?: string;
  company?: string;
  avatar_color?: string;
}

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [education, setEducation] = useState<Education[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'experience' | 'education' | 'skill' | 'certificate' | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<Partial<UserProfile>>({});
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);

  const profileImageRef = useRef<HTMLInputElement>(null);
  const coverImageRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      loadAllData();
    }
  }, [user]);

  const loadAllData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Load all data in parallel for faster loading
      const [profileResult, expResult, eduResult, skillsResult, certsResult] = await Promise.all([
        // Load or create profile
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        // Load experiences
        supabase.from('experiences').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
        // Load education
        supabase.from('education').select('*').eq('user_id', user.id).order('start_date', { ascending: false }),
        // Load skills
        supabase.from('skills').select('*').eq('user_id', user.id),
        // Load certificates
        supabase.from('certificates').select('*').eq('user_id', user.id).order('issue_date', { ascending: false })
      ]);

      // Handle profile
      let profileData = null;
      if (profileResult.data) {
        profileData = profileResult.data;
      } else if (profileResult.error?.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const newProfile = {
          id: user.id,
          full_name: user.email?.split('@')[0] || 'User',
          username: '0302CS' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0'),
          headline: '',
          bio: '',
          location: '',
          website: '',
          company: '',
          avatar_color: '#667eea'
        };

        const { data: created, error: createError } = await supabase
          .from('profiles')
          .insert([newProfile])
          .select()
          .single();

        if (created) {
          profileData = created;
        } else {
          console.error('Error creating profile:', createError);
        }
      } else {
        console.error('Error loading profile:', profileResult.error);
      }

      if (profileData) {
        setProfile(profileData);
        setFormData(profileData);
      }

      // Set experiences, education, skills, and certificates
      if (expResult.data) setExperiences(expResult.data);
      if (expResult.error) console.error('Error loading experiences:', expResult.error);

      if (eduResult.data) setEducation(eduResult.data);
      if (eduResult.error) console.error('Error loading education:', eduResult.error);

      if (skillsResult.data) setSkills(skillsResult.data);
      if (skillsResult.error) console.error('Error loading skills:', skillsResult.error);

      if (certsResult.data) setCertificates(certsResult.data);
      if (certsResult.error) console.error('Error loading certificates:', certsResult.error);
    } catch (error) {
      console.error('Unexpected error loading profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkUsernameAvailability = async (username: string) => {
    if (!username || username.length < 3 || username === profile?.username) {
      setUsernameAvailable(null);
      return;
    }

    setCheckingUsername(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user?.id || '')
        .single();

      setUsernameAvailable(!data);
    } catch (error) {
      setUsernameAvailable(true);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate username if changed
    if (formData.username && formData.username !== profile?.username) {
      if (formData.username.length < 3) {
        alert('Username must be at least 3 characters long');
        return;
      }

      // Check username availability
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', formData.username)
        .neq('id', user.id)
        .single();

      if (existingUser) {
        alert('Username is already taken. Please choose another one.');
        return;
      }
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(formData)
        .eq('id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
      } else if (data) {
        setProfile(data as UserProfile);
        setIsEditingProfile(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}_${type}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Delete old image if exists
      const oldUrl = type === 'profile' ? profile?.profile_image_url : profile?.cover_image_url;
      if (oldUrl) {
        const oldPath = oldUrl.split('/').pop();
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        alert(`Upload failed: ${uploadError.message}. Please make sure the 'avatars' storage bucket exists and is public.`);
        setLoading(false);
        return;
      }

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const imageUrl = data.publicUrl;

      // Update profile
      const updateField = type === 'profile' ? 'profile_image_url' : 'cover_image_url';
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ [updateField]: imageUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Update error:', updateError);
        alert('Failed to update profile. Please try again.');
      } else {
        setProfile({ ...profile, [updateField]: imageUrl } as UserProfile);
        alert('Image uploaded successfully!');
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openModal = (type: 'experience' | 'education' | 'skill' | 'certificate') => {
    setModalType(type);
    setShowModal(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Unable to load profile. Please refresh the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-0 md:px-4 pb-24 md:pb-4">
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <div className="animate-spin inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-700 font-medium">Uploading image...</p>
          </div>
        </div>
      )}

      {/* Profile Header Card */}
      <div className="bg-white md:rounded-lg md:shadow-sm md:border border-gray-200 overflow-hidden mb-3 md:mb-4">
        {/* Cover Image */}
        <div className="h-32 md:h-48 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 relative">
          {profile.cover_image_url && (
            <img src={profile.cover_image_url} alt="" className="w-full h-full object-cover" />
          )}
          <button
            onClick={() => coverImageRef.current?.click()}
            disabled={loading}
            className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Change cover image"
          >
            <Camera size={18} className="text-gray-700" />
          </button>
          <input
            ref={coverImageRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageUpload(e, 'cover')}
            disabled={loading}
          />
        </div>

        {/* Profile Info */}
        <div className="px-4 md:px-6 pb-6">
          <div className="flex flex-col md:flex-row items-start md:items-end gap-3 md:gap-4 -mt-12 md:-mt-20 relative z-10 mb-3 md:mb-4">
            {/* Avatar */}
            <div className="relative">
              <div
                className="w-24 h-24 md:w-36 md:h-36 rounded-full border-4 border-white overflow-hidden bg-white shadow-lg"
                style={{ backgroundColor: profile.avatar_color || '#667eea' }}
              >
                {profile.profile_image_url ? (
                  <img src={profile.profile_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-3xl md:text-4xl font-bold">
                    {getInitials(profile.full_name)}
                  </div>
                )}
              </div>
              <button
                onClick={() => profileImageRef.current?.click()}
                disabled={loading}
                className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Change profile picture"
              >
                <Camera size={16} className="text-gray-700" />
              </button>
              <input
                ref={profileImageRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageUpload(e, 'profile')}
                disabled={loading}
              />
            </div>

            {/* Name and Actions */}
            <div className="flex-1 w-full">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl md:text-3xl font-bold text-gray-900 break-words">{profile.full_name}</h1>
                  {profile.username && (
                    <p className="text-xs md:text-sm text-gray-500 mt-0.5">@{profile.username}</p>
                  )}
                  {profile.headline && <p className="text-sm md:text-lg text-gray-600 mt-1 break-words">{profile.headline}</p>}
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                    {profile.location && (
                      <div className="flex items-center gap-1">
                        <MapPin size={16} />
                        <span>{profile.location}</span>
                      </div>
                    )}
                    {profile.company && (
                      <div className="flex items-center gap-1">
                        <Briefcase size={16} />
                        <span>{profile.company}</span>
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full md:w-auto px-4 md:px-6 py-2.5 border-2 border-indigo-600 text-indigo-600 rounded-full font-semibold hover:bg-indigo-50 transition flex items-center gap-2 justify-center active:scale-95"
                >
                  <Edit2 size={18} />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* About Section */}
      {profile.bio && (
        <div className="bg-white md:rounded-lg md:shadow-sm md:border border-gray-200 p-4 md:p-6 mb-3 md:mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{profile.bio}</p>
        </div>
      )}

      {/* Experience Section */}
      <div className="bg-white md:rounded-lg md:shadow-sm md:border border-gray-200 p-4 md:p-6 mb-3 md:mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Briefcase size={24} />
            Experience
          </h2>
          <button
            onClick={() => openModal('experience')}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <Plus size={20} className="text-indigo-600" />
          </button>
        </div>
        <div className="space-y-4">
          {experiences.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No experience added yet</p>
          ) : (
            experiences.map((exp) => (
              <ExperienceItem key={exp.id} experience={exp} onDelete={() => deleteExperience(exp.id)} />
            ))
          )}
        </div>
      </div>

      {/* Education Section */}
      <div className="bg-white md:rounded-lg md:shadow-sm md:border border-gray-200 p-4 md:p-6 mb-3 md:mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap size={24} />
            Education
          </h2>
          <button
            onClick={() => openModal('education')}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <Plus size={20} className="text-indigo-600" />
          </button>
        </div>
        <div className="space-y-4">
          {education.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No education added yet</p>
          ) : (
            education.map((edu) => (
              <EducationItem key={edu.id} education={edu} onDelete={() => deleteEducation(edu.id)} />
            ))
          )}
        </div>
      </div>

      {/* Skills Section */}
      <div className="bg-white md:rounded-lg md:shadow-sm md:border border-gray-200 p-4 md:p-6 mb-3 md:mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award size={24} />
            Skills
          </h2>
          <button
            onClick={() => openModal('skill')}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <Plus size={20} className="text-indigo-600" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {skills.length === 0 ? (
            <p className="text-gray-500 text-center py-4 w-full">No skills added yet</p>
          ) : (
            skills.map((skill) => (
              <SkillBadge key={skill.id} skill={skill} onDelete={() => deleteSkill(skill.id)} />
            ))
          )}
        </div>
      </div>

      {/* Certificates Section */}
      <div className="bg-white md:rounded-lg md:shadow-sm md:border border-gray-200 p-4 md:p-6 mb-3 md:mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Award size={24} />
            Licenses & Certifications
          </h2>
          <button
            onClick={() => openModal('certificate')}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <Plus size={20} className="text-indigo-600" />
          </button>
        </div>
        <div className="space-y-4">
          {certificates.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No certificates added yet</p>
          ) : (
            certificates.map((cert) => (
              <CertificateItem key={cert.id} certificate={cert} onDelete={() => deleteCertificate(cert.id)} />
            ))
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditingProfile && (
        <Modal title="Edit Profile" onClose={() => setIsEditingProfile(false)}>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                value={formData.full_name || ''}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username *
                {checkingUsername && <span className="text-xs text-gray-500 ml-2">(checking...)</span>}
                {usernameAvailable === true && <span className="text-xs text-green-600 ml-2">✓ Available</span>}
                {usernameAvailable === false && <span className="text-xs text-red-600 ml-2">✗ Taken</span>}
              </label>
              <input
                type="text"
                value={formData.username || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFormData({ ...formData, username: value });
                  if (value.length >= 3) {
                    checkUsernameAvailability(value);
                  } else {
                    setUsernameAvailable(null);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="0302CS000001"
                minLength={3}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Suggested format: 0302CS + your student ID (e.g., 0302CS210001). Must be unique and at least 3 characters.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Headline</label>
              <input
                type="text"
                value={formData.headline || ''}
                onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Full Stack Developer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="City, Country"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={formData.company || ''}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your company"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
              <textarea
                value={formData.bio || ''}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={5}
                placeholder="Tell us about yourself"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar Color</label>
              <input
                type="color"
                value={formData.avatar_color || '#667eea'}
                onChange={(e) => setFormData({ ...formData, avatar_color: e.target.value })}
                className="w-full h-12 border border-gray-300 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || usernameAvailable === false}
                className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:bg-gray-300 transition"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Item Modal */}
      {showModal && modalType && (
        <AddItemModal
          type={modalType}
          onClose={() => setShowModal(false)}
          onAdd={async (data) => {
            if (modalType === 'experience') await addExperience(data);
            else if (modalType === 'education') await addEducation(data);
            else if (modalType === 'skill') await addSkill(data);
            else if (modalType === 'certificate') await addCertificate(data);
          }}
        />
      )}
    </div>
  );

  async function deleteExperience(id: string) {
    await supabase.from('experiences').delete().eq('id', id);
    setExperiences(experiences.filter((e) => e.id !== id));
  }

  async function deleteEducation(id: string) {
    await supabase.from('education').delete().eq('id', id);
    setEducation(education.filter((e) => e.id !== id));
  }

  async function deleteSkill(id: string) {
    await supabase.from('skills').delete().eq('id', id);
    setSkills(skills.filter((s) => s.id !== id));
  }

  async function deleteCertificate(id: string) {
    await supabase.from('certificates').delete().eq('id', id);
    setCertificates(certificates.filter((c) => c.id !== id));
  }

  async function addExperience(data: any) {
    if (!user) return;
    const { data: newExp, error } = await supabase
      .from('experiences')
      .insert([{ ...data, user_id: user.id }])
      .select()
      .single();
    if (!error && newExp) {
      setExperiences([newExp, ...experiences]);
      setShowModal(false);
    }
  }

  async function addEducation(data: any) {
    if (!user) return;
    const { data: newEdu, error } = await supabase
      .from('education')
      .insert([{ ...data, user_id: user.id }])
      .select()
      .single();
    if (!error && newEdu) {
      setEducation([newEdu, ...education]);
      setShowModal(false);
    }
  }

  async function addSkill(data: any) {
    if (!user) return;
    const { data: newSkill, error } = await supabase
      .from('skills')
      .insert([{ ...data, user_id: user.id }])
      .select()
      .single();
    if (!error && newSkill) {
      setSkills([...skills, newSkill]);
      setShowModal(false);
    }
  }

  async function addCertificate(data: any) {
    if (!user) return;
    const { data: newCert, error } = await supabase
      .from('certificates')
      .insert([{ ...data, user_id: user.id }])
      .select()
      .single();
    if (!error && newCert) {
      setCertificates([newCert, ...certificates]);
      setShowModal(false);
    }
  }
}

// Component: Experience Item
function ExperienceItem({ experience, onDelete }: { experience: Experience; onDelete: () => void }) {
  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  return (
    <div className="flex gap-3 group">
      <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Briefcase size={24} className="text-indigo-600" />
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{experience.position}</h3>
            <p className="text-gray-700">{experience.company}</p>
            <p className="text-sm text-gray-500">
              {formatDate(experience.start_date)} - {experience.is_current ? 'Present' : formatDate(experience.end_date)}
            </p>
            {experience.description && <p className="text-gray-600 mt-2">{experience.description}</p>}
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Component: Education Item
function EducationItem({ education, onDelete }: { education: Education; onDelete: () => void }) {
  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  return (
    <div className="flex gap-3 group">
      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <GraduationCap size={24} className="text-blue-600" />
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{education.school}</h3>
            <p className="text-gray-700">
              {education.degree}{education.field_of_study ? ` in ${education.field_of_study}` : ''}
            </p>
            <p className="text-sm text-gray-500">
              {formatDate(education.start_date)} - {education.end_date ? formatDate(education.end_date) : 'Present'}
            </p>
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Component: Skill Badge
function SkillBadge({ skill, onDelete }: { skill: Skill; onDelete: () => void }) {
  return (
    <div className="group relative inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full font-medium hover:bg-indigo-100 transition">
      <span>{skill.skill_name}</span>
      {skill.endorsements && skill.endorsements > 0 && (
        <span className="text-xs opacity-75">• {skill.endorsements} endorsements</span>
      )}
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 ml-1 hover:text-red-600 transition"
      >
        <X size={16} />
      </button>
    </div>
  );
}

// Component: Certificate Item
function CertificateItem({ certificate, onDelete }: { certificate: Certificate; onDelete: () => void }) {
  const formatDate = (date: string | null) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  return (
    <div className="flex gap-3 group">
      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <Award size={24} className="text-green-600" />
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{certificate.certificate_name}</h3>
            <p className="text-gray-700">{certificate.issuing_organization}</p>
            <p className="text-sm text-gray-500 mt-1">
              Issued {formatDate(certificate.issue_date)}
              {certificate.expiry_date && ` · Expires ${formatDate(certificate.expiry_date)}`}
            </p>
            {certificate.credential_id && (
              <p className="text-xs text-gray-500 mt-1">Credential ID: {certificate.credential_id}</p>
            )}
            {certificate.description && <p className="text-gray-600 mt-2">{certificate.description}</p>}
            {certificate.credential_url && (
              <a
                href={certificate.credential_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-sm text-indigo-600 hover:underline"
              >
                <span>Show credential</span>
                <ExternalLink size={14} />
              </a>
            )}
          </div>
          <button
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Component: Modal
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition">
            <X size={20} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

// Component: Add Item Modal
function AddItemModal({
  type,
  onClose,
  onAdd,
}: {
  type: 'experience' | 'education' | 'skill' | 'certificate';
  onClose: () => void;
  onAdd: (data: any) => void;
}) {
  const [formData, setFormData] = useState<any>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
  };

  return (
    <Modal title={`Add ${type.charAt(0).toUpperCase() + type.slice(1)}`} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {type === 'experience' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position *</label>
              <input
                type="text"
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                placeholder="e.g., Software Engineer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
              <input
                type="text"
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_current"
                onChange={(e) => setFormData({ ...formData, is_current: e.target.checked, end_date: e.target.checked ? null : formData.end_date })}
                className="rounded"
              />
              <label htmlFor="is_current" className="text-sm font-medium text-gray-700">Currently working here</label>
            </div>
            {!formData.is_current && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={4}
                placeholder="Describe your role and achievements..."
              />
            </div>
          </>
        )}

        {type === 'education' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">School *</label>
              <input
                type="text"
                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Degree *</label>
              <input
                type="text"
                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                placeholder="e.g., Bachelor of Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Field of Study</label>
              <input
                type="text"
                onChange={(e) => setFormData({ ...formData, field_of_study: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Computer Science"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
              <input
                type="date"
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                placeholder="Leave empty if still studying"
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </>
        )}

        {type === 'skill' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skill Name *</label>
              <input
                type="text"
                onChange={(e) => setFormData({ ...formData, skill_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                placeholder="e.g., JavaScript, Project Management"
              />
            </div>
          </>
        )}

        {type === 'certificate' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Name *</label>
              <input
                type="text"
                onChange={(e) => setFormData({ ...formData, certificate_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                placeholder="e.g., AWS Certified Solutions Architect"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issuing Organization *</label>
              <input
                type="text"
                onChange={(e) => setFormData({ ...formData, issuing_organization: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
                placeholder="e.g., Amazon Web Services"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Date *</label>
              <input
                type="date"
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
              <input
                type="date"
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value || null })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Leave empty if no expiry"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credential ID (Optional)</label>
              <input
                type="text"
                onChange={(e) => setFormData({ ...formData, credential_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., ABC123XYZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credential URL (Optional)</label>
              <input
                type="url"
                onChange={(e) => setFormData({ ...formData, credential_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="https://www.credential-verify.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optional)</label>
              <textarea
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
                placeholder="Add any relevant details about this certification..."
              />
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
          >
            Add
          </button>
        </div>
      </form>
    </Modal>
  );
}

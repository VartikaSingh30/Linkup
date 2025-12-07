import { useState, useEffect } from 'react';
import { Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { PostCard } from '../components/PostCard';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  profiles?: any;
}

export function HomePage() {
  const { user } = useAuth();
  const [postContent, setPostContent] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadPosts();
      setupRealtimeListener();
    }
  }, [user]);

  const loadUserProfile = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('id', user?.id).single();
    setUserProfile(data);
  };

  const loadPosts = async () => {
    if (!user) return;

    // Get list of followed users
    const { data: followedUsers } = await supabase
      .from('connections')
      .select('following_id')
      .eq('follower_id', user.id);

    const followedIds = followedUsers?.map(f => f.following_id) || [];

    // Include both own posts and posts from followed users
    const userIdsToShow = [user.id, ...followedIds];

    // Load posts from own account and followed users
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(id, full_name, headline, profile_image_url, username)')
      .in('user_id', userIdsToShow)
      .order('created_at', { ascending: false })
      .limit(50);

    setPosts(data || []);
  };

  const setupRealtimeListener = () => {
    const postsChannel = supabase
      .channel('posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          loadPosts();
        } else if (payload.eventType === 'DELETE') {
          setPosts(posts.filter((p) => p.id !== payload.old.id));
        }
      })
      .subscribe();

    // Also listen for follow changes to refresh feed
    const followsChannel = supabase
      .channel('connections')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(followsChannel);
    };
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabase.storage.from('posts').upload(filePath, file);
    if (error) {
      console.error('Upload error:', error);
      alert('Upload failed: ' + error.message + '. Please make sure the "posts" storage bucket exists and has proper policies.');
      return null;
    }

    const { data } = supabase.storage.from('posts').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const createPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!postContent.trim() && !imageFile)) return;

    setLoading(true);

    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
        if (!imageUrl && imageFile) {
          // Upload failed, stop here
          setLoading(false);
          return;
        }
      }

      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: postContent,
          image_url: imageUrl,
        })
        .select('*, profiles(id, full_name, headline, profile_image_url)')
        .single();

      if (error) {
        console.error('Error creating post:', error);
        alert('Failed to create post: ' + error.message);
        throw error;
      }

      setPosts([data, ...posts]);
      setPostContent('');
      setImageFile(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setLoading(false);
    }
  };

  const deletePost = (postId: string) => {
    setPosts(posts.filter((p) => p.id !== postId));
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-0 md:px-0 py-0">
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex gap-4 mb-4">
          {userProfile?.profile_image_url ? (
            <img src={userProfile.profile_image_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500" />
          )}

          <form onSubmit={createPost} className="flex-1">
            <textarea
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              placeholder="Start a post or share an idea..."
              className="w-full px-4 py-3 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={3}
              disabled={loading}
            />

            {previewUrl && (
              <div className="relative mt-4 mb-4">
                <img src={previewUrl} alt="Preview" className="max-h-64 rounded-lg w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setPreviewUrl('');
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center gap-2 text-indigo-600 cursor-pointer hover:bg-indigo-50 px-3 py-2 rounded-lg transition">
                <Image size={18} />
                <span className="text-sm font-medium">Photo</span>
                <input type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
              </label>

              <button
                type="submit"
                disabled={loading || (!postContent.trim() && !imageFile)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-gray-300 font-semibold transition"
              >
                {loading ? 'Posting...' : 'Post'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div>
        {posts.map((post) => (
          <PostCard key={post.id} post={post} onDelete={deletePost} />
        ))}
        {posts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No posts yet. Follow people or create your first post!</p>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Send, Bot, Trash2, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface Conversation {
  id: string;
  full_name: string;
  profile_image_url?: string;
  last_message?: string;
  unread?: boolean;
  isAI?: boolean;
  isPinned?: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  role?: 'user' | 'assistant';
}

interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function MessagesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>('ai-assistant');
  const [messages, setMessages] = useState<Message[]>([]);
  const [aiMessages, setAIMessages] = useState<AIMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const API_KEY = 'AIzaSyBODTk8lRxtxKvz3J_kQI40g9Xco7Lt0DI';

  // Check if a user was passed via navigation state
  useEffect(() => {
    if (location.state?.selectedUserId) {
      setSelectedUserId(location.state.selectedUserId);
    }
  }, [location.state]);

  useEffect(() => {
    if (user) {
      loadConversations();
      loadAIMessages();
    }
  }, [user]);

  useEffect(() => {
    if (selectedUserId && selectedUserId !== 'ai-assistant') {
      loadMessages();
      const cleanup = setupRealtimeListener();
      return cleanup;
    }
    scrollToBottom();
  }, [selectedUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, aiMessages]);

  // Set up global message listener to update conversations
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('all-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          const newMsg = payload.new;
          // Check if this message involves the current user
          if (newMsg.sender_id === user.id || newMsg.receiver_id === user.id) {
            // Reload conversations to update the list
            loadConversations();

            // If the message is for the currently selected conversation, add it to messages
            if (selectedUserId &&
              ((newMsg.sender_id === user.id && newMsg.receiver_id === selectedUserId) ||
                (newMsg.sender_id === selectedUserId && newMsg.receiver_id === user.id))) {
              setMessages((prev) => {
                // Avoid duplicates
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg as Message];
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUserId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadAIMessages = () => {
    const saved = localStorage.getItem('linkup.chat.history');
    if (saved) {
      setAIMessages(JSON.parse(saved));
    }
  };

  const saveAIMessages = (msgs: AIMessage[]) => {
    localStorage.setItem('linkup.chat.history', JSON.stringify(msgs));
    setAIMessages(msgs);
  };

  const clearAIChat = () => {
    setAIMessages([]);
    localStorage.removeItem('linkup.chat.history');
  };

  const loadConversations = async () => {
    if (!user) return;

    // Get unique user IDs from messages
    const { data: messagesData } = await supabase
      .from('messages')
      .select('sender_id, receiver_id, content, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    const userIds = new Set<string>();
    const lastMessages = new Map<string, { content: string; timestamp: string }>();

    if (messagesData) {
      messagesData.forEach((msg: any) => {
        const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id;
        userIds.add(otherId);

        // Store the last message for each user
        if (!lastMessages.has(otherId)) {
          lastMessages.set(otherId, {
            content: msg.content,
            timestamp: msg.created_at
          });
        }
      });
    }

    // Fetch profiles for these users
    const conversationMap = new Map<string, Conversation>();

    if (userIds.size > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, profile_image_url')
        .in('id', Array.from(userIds));

      if (profilesData) {
        profilesData.forEach((profile: any) => {
          const lastMsg = lastMessages.get(profile.id);
          conversationMap.set(profile.id, {
            id: profile.id,
            full_name: profile.full_name || 'Unknown User',
            profile_image_url: profile.profile_image_url,
            last_message: lastMsg ? (lastMsg.content.substring(0, 50) + (lastMsg.content.length > 50 ? '...' : '')) : '',
          });
        });
      }
    }

    // Add AI Assistant as pinned conversation at the top
    const allConversations: Conversation[] = [
      {
        id: 'ai-assistant',
        full_name: 'AI Assistant',
        profile_image_url: '',
        last_message: 'AI-powered chat assistant',
        isAI: true,
        isPinned: true,
      },
      ...Array.from(conversationMap.values()),
    ];

    setConversations(allConversations);
  };

  const loadMessages = async () => {
    if (!user || !selectedUserId) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    setMessages(data || []);

    // Mark messages as read
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', selectedUserId);
  };

  const setupRealtimeListener = () => {
    if (!user || !selectedUserId) return;

    const channel = supabase
      .channel(`messages-${selectedUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          const newMsg = payload.new;
          // Only add if it's between current user and selected user
          if ((newMsg.sender_id === user.id && newMsg.receiver_id === selectedUserId) ||
            (newMsg.sender_id === selectedUserId && newMsg.receiver_id === user.id)) {
            setMessages((prev) => {
              // Avoid duplicates
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg as Message];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    // Handle AI Chat
    if (selectedUserId === 'ai-assistant') {
      const userMsg: AIMessage = {
        role: 'user',
        content: messageText.trim(),
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...aiMessages, userMsg];
      saveAIMessages(updatedMessages);
      setMessageText('');
      setIsAILoading(true);

      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: userMsg.content }] }],
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Gemini API Error:', errorData);
          throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not generate a response.';

        const aiMsg: AIMessage = {
          role: 'assistant',
          content: aiText,
          timestamp: new Date().toISOString(),
        };

        saveAIMessages([...updatedMessages, aiMsg]);
      } catch (error) {
        console.error('Error:', error);
        const errorMsg: AIMessage = {
          role: 'assistant',
          content: 'Sorry, there was an error processing your request.',
          timestamp: new Date().toISOString(),
        };
        saveAIMessages([...updatedMessages, errorMsg]);
      } finally {
        setIsAILoading(false);
      }
      return;
    }

    // Handle regular messages
    if (!user || !selectedUserId) return;

    const messageContent = messageText.trim();
    setMessageText('');
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: selectedUserId,
          content: messageContent,
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        setMessageText(messageContent); // Restore message on error
        alert('Failed to send message. Please try again.');
      } else if (data) {
        // Message will be added via realtime listener, but we can add it optimistically
        setMessages((prev) => {
          if (prev.some(m => m.id === data.id)) return prev;
          return [...prev, data as Message];
        });
        // Update conversations list
        loadConversations();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setMessageText(messageContent);
      alert('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1 rounded">$1</code>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" class="text-indigo-600 underline">$1</a>');
  };

  return (
    <div className="h-[calc(100dvh-140px)] md:h-[calc(100vh-80px)] flex flex-col md:flex-row gap-0 md:gap-4 max-w-6xl mx-auto px-0 md:px-4 pb-0 md:pb-4 overflow-hidden">
      {/* Conversations List - Full width on mobile when no chat selected */}
      <div className={`${selectedUserId ? 'hidden md:block' : 'block'} md:w-64 bg-white md:rounded-lg md:border border-gray-200 overflow-y-auto flex-shrink-0 h-full`}>
        <div className="p-3 md:p-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>
          <div className="space-y-1 md:space-y-2">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedUserId(conv.id)}
                className={`w-full text-left px-3 md:px-4 py-3 rounded-lg transition ${selectedUserId === conv.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'hover:bg-gray-50'
                  }`}
              >
                {conv.isAI ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="text-white" size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-base">{conv.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {conv.profile_image_url ? (
                      <img
                        src={conv.profile_image_url}
                        alt={conv.full_name}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0 text-white font-bold">
                        {conv.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{conv.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{conv.last_message}</p>
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Area - Full screen on mobile */}
      <div className={`${selectedUserId ? 'flex' : 'hidden md:flex'} flex-1 bg-white md:rounded-lg md:border border-gray-200 flex-col overflow-hidden h-full`}>
        {selectedUserId ? (
          <div className="flex flex-col h-full">
            {/* Header - Sticky at top */}
            <div className="flex-shrink-0 border-b border-gray-200 p-3 md:p-4 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between sticky top-0 z-20 shadow-sm">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Back button on mobile */}
                <button
                  onClick={() => setSelectedUserId(null)}
                  className="md:hidden p-2 hover:bg-white rounded-lg transition flex-shrink-0"
                  aria-label="Back to conversations"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>

                {selectedUserId === 'ai-assistant' ? (
                  <>
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="text-white" size={20} />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-gray-900 text-base md:text-lg truncate">AI Assistant</h2>
                      <p className="text-xs md:text-sm text-gray-600">Online</p>
                    </div>
                  </>
                ) : (
                  <>
                    {conversations.find((c) => c.id === selectedUserId)?.profile_image_url ? (
                      <img
                        src={conversations.find((c) => c.id === selectedUserId)?.profile_image_url}
                        alt={conversations.find((c) => c.id === selectedUserId)?.full_name}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                        {conversations.find((c) => c.id === selectedUserId)?.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h2 className="font-bold text-gray-900 text-base md:text-lg truncate">
                        {conversations.find((c) => c.id === selectedUserId)?.full_name}
                      </h2>
                      <p className="text-xs md:text-sm text-gray-600">Active now</p>
                    </div>
                  </>
                )}
              </div>
              {selectedUserId === 'ai-assistant' && aiMessages.length > 0 && (
                <button
                  onClick={clearAIChat}
                  className="p-2 md:px-3 md:py-2 text-gray-700 hover:bg-white rounded-lg transition flex-shrink-0"
                  title="Clear chat history"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            {/* Messages - Scrollable */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50" style={{ WebkitOverflowScrolling: 'touch' }}>
              {selectedUserId === 'ai-assistant' ? (
                // AI Chat Messages
                <>
                  {aiMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center p-4">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-indigo-100 flex items-center justify-center mb-4">
                        <MessageSquare className="text-indigo-600" size={32} />
                      </div>
                      <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Welcome to AI Chat!</h3>
                      <p className="text-sm md:text-base text-gray-600 max-w-md">
                        Start a conversation with the AI assistant. Ask questions, get help, or just chat!
                      </p>
                    </div>
                  ) : (
                    <>
                      {aiMessages.map((msg, index) => (
                        <div
                          key={index}
                          className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} chat-message`}
                        >
                          <div className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user'
                            ? 'bg-indigo-500'
                            : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                            }`}>
                            {msg.role === 'user' ? (
                              <span className="text-white font-bold text-xs md:text-sm">U</span>
                            ) : (
                              <Bot className="text-white" size={16} />
                            )}
                          </div>
                          <div className={`flex-1 max-w-[80%] md:max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                            <div
                              className={`px-3 md:px-4 py-2 md:py-2.5 rounded-2xl text-sm md:text-base ${msg.role === 'user'
                                ? 'bg-indigo-600 text-white rounded-tr-none'
                                : 'bg-white text-gray-900 rounded-tl-none shadow-sm'
                                }`}
                              dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                            />
                            <span className="text-xs text-gray-500 mt-1 px-1">
                              {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      ))}
                      {isAILoading && (
                        <div className="flex gap-2">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                            <Bot className="text-white" size={16} />
                          </div>
                          <div className="bg-white px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                // Regular Messages
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] md:max-w-[70%] px-3 md:px-4 py-2 md:py-2.5 rounded-2xl text-sm md:text-base ${msg.sender_id === user?.id
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white text-gray-900 rounded-tl-none shadow-sm'
                        }`}
                    >
                      <p>{msg.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - Sticky at bottom */}
            <div className="flex-shrink-0 border-t border-gray-200 p-3 md:p-4 bg-white sticky bottom-0 z-20 shadow-[0_-2px_8px_rgba(0,0,0,0.1)]">
              <form onSubmit={sendMessage} className="flex gap-2 items-end w-full">
                <textarea
                  value={messageText}
                  onChange={(e) => {
                    setMessageText(e.target.value);
                    // Auto-resize textarea
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage(e);
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 px-3 md:px-4 py-2.5 md:py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-base max-h-[100px]"
                  rows={1}
                  disabled={loading || isAILoading}
                  style={{ minHeight: '44px', lineHeight: '1.5' }}
                />
                <button
                  type="submit"
                  disabled={loading || isAILoading || !messageText.trim()}
                  className="w-11 h-11 md:w-12 md:h-12 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center flex-shrink-0 shadow-md active:scale-95"
                >
                  <Send size={20} />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p className="text-sm sm:text-base">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}

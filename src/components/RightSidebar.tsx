import { Info, TrendingUp, UserPlus, ExternalLink, Github, Linkedin, MoreHorizontal } from 'lucide-react';

export function RightSidebar() {
    const trends = [
        { tag: '#WebDevelopment', posts: '125k posts' },
        { tag: '#ReactJS', posts: '85k posts' },
        { tag: '#TechCareers', posts: '52k posts' },
        { tag: '#RemoteWork', posts: '48k posts' },
        { tag: '#AIRevolution', posts: '32k posts' },
    ];

    const suggestions = [
        { name: 'Shruti Singh', role: 'UX Designer at Google', initials: 'SS', color: 'bg-pink-500' },
        { name: 'Nandini Singh', role: 'Frontend Lead at Meta', initials: 'NS', color: 'bg-emerald-500' },
        { name: 'Raj Singh', role: 'Product Manager', initials: 'RS', color: 'bg-amber-500' },
    ];

    return (
        <aside className="w-80 hidden xl:block flex-shrink-0 space-y-4">
            {/* Creator Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
                <div className="relative mt-8 text-center">
                    <div className="w-16 h-16 mx-auto bg-white rounded-full p-1 shadow-md">
                        <div className="w-full h-full rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xl border-2 border-indigo-50">
                            VS
                        </div>
                    </div>
                    <h3 className="mt-2 font-bold text-gray-900">Vartika Singh</h3>
                    <p className="text-xs text-gray-500">Full Stack Developer</p>
                    <p className="text-sm text-gray-600 mt-2 px-2">
                        Creator of LinkUp. Passionate about building community-driven platforms.
                    </p>

                    <div className="mt-4 flex justify-center gap-2">
                        <a href="https://github.com/VartikaSingh30" className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-full transition">
                            <Github size={18} />
                        </a>
                        <a href="https://www.linkedin.com/in/contact-vartikasingh?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-50 rounded-full transition">
                            <Linkedin size={18} />
                        </a>
                        <a href="https://x.com/Vartikaa_X?t=AerkX8VJuo1hAvpO8aAXjA&s=08" className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-full transition">
                            <ExternalLink size={18} />
                        </a>
                    </div>
                </div>
            </div>

            {/* Trending Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp size={18} />
                        Trending Now
                    </h3>
                    <Info size={16} className="text-gray-400" />
                </div>
                <div className="space-y-4">
                    {trends.map((trend, index) => (
                        <div key={index} className="flex justify-between items-start group cursor-pointer">
                            <div>
                                <p className="font-semibold text-gray-800 text-sm group-hover:text-indigo-600 transition">{trend.tag}</p>
                                <p className="text-xs text-gray-500">{trend.posts}</p>
                            </div>
                            <MoreHorizontal size={16} className="text-gray-400 opacity-0 group-hover:opacity-100 transition" />
                        </div>
                    ))}
                </div>
                <button className="w-full mt-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-lg transition">
                    Show more
                </button>
            </div>

            {/* Suggested Connections */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">People you may know</h3>
                <div className="space-y-4">
                    {suggestions.map((person, index) => (
                        <div key={index} className="flex items-start gap-3">
                            <div className={`w-10 h-10 ${person.color} rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>
                                {person.initials}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 text-sm truncate">{person.name}</h4>
                                <p className="text-xs text-gray-500 truncate">{person.role}</p>
                                <button className="mt-2 flex items-center gap-1 text-xs font-semibold text-indigo-600 border border-indigo-600 px-3 py-1 rounded-full hover:bg-indigo-50 transition">
                                    <UserPlus size={12} />
                                    Connect
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer Links */}
            <div className="flex flex-wrap gap-2 text-xs text-center text-gray-500 px-4">
                <a href="#" className="hover:underline">About</a>
                <span>•</span>
                <a href="#" className="hover:underline">Accessibility</a>
                <span>•</span>
                <a href="#" className="hover:underline">Help Center</a>
                <span>•</span>
                <a href="#" className="hover:underline">Privacy & Terms</a>
                <p className="w-full mt-2">© 2025 LinkUp Corporation</p>
            </div>
        </aside>
    );
}

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const SocialIcon = ({ platform, size = 20, className }) => {
  const getPath = () => {
    switch(platform.toLowerCase()) {
      case 'facebook': return <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>;
      case 'instagram': return <><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></>;
      case 'twitter': return <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>;
      case 'linkedin': return <><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></>;
      case 'youtube': return <><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2C5.12 19.5 12 19.5 12 19.5s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></>;
      default: return <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></>;
    }
  };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {getPath()}
    </svg>
  );
};

const PlatformFooter = () => {
  const [policies, setPolicies] = useState([]);
  const [socialLinks, setSocialLinks] = useState([]);

  useEffect(() => {
    const fetchFooterData = async () => {
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3011';
        const [policyRes, socialRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/platform-policies/public`),
          fetch(`${API_BASE_URL}/api/platform-social-media/public`)
        ]);
        
        if (policyRes.ok) setPolicies(await policyRes.json());
        if (socialRes.ok) setSocialLinks(await socialRes.json());
        
      } catch (err) {
        console.error('Failed to fetch platform footer data:', err);
      }
    };
    fetchFooterData();
  }, []);

  return (
    <footer className="bg-white border-t border-slate-200 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 z-10 shrink-0">
      <div className="flex items-center gap-6 flex-wrap justify-center text-sm font-bold text-slate-500">
        {policies.map(policy => (
          <Link key={policy._id} to={`/policies/${policy.type}`} className="hover:text-[#76b900] transition-colors">
            {policy.title}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-5 text-slate-400">
        {socialLinks.length > 0 ? socialLinks.map(link => (
          <a key={link._id} href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">
            <SocialIcon platform={link.platform} />
          </a>
        )) : (
          <>
            <a href="#" className="hover:text-blue-600 transition-colors"><SocialIcon platform="facebook" /></a>
            <a href="#" className="hover:text-pink-600 transition-colors"><SocialIcon platform="instagram" /></a>
            <a href="#" className="hover:text-sky-500 transition-colors"><SocialIcon platform="twitter" /></a>
          </>
        )}
      </div>
    </footer>
  );
};

export default PlatformFooter;
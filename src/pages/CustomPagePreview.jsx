import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Check, AlertCircle, PlayCircle } from 'lucide-react';

const CustomPagePreview = ({ token }) => {
  const { storeId, pageId } = useParams();
  const navigate = useNavigate();

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [publishing, setPublishing] = useState(false);

  const fetchPage = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-pages/page/${pageId}/preview`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      if (res.ok) {
        setPage(await res.json());
      } else {
        const err = await res.json();
        setError(err.message || 'Failed to load preview');
      }
    } catch (e) {
      setError('Connection error trying to fetch preview.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const handleTogglePublish = async () => {
    if (!page) return;
    setPublishing(true);
    const action = page.isPublished ? 'unpublish' : 'publish';
    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-pages/page/${page._id}/${action}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        setPage(data.page || { ...page, isPublished: !page.isPublished, status: action === 'publish' ? 'published' : 'draft' });
        alert(`Page has been ${action}ed successfully!`);
      } else {
        const data = await res.json();
        alert(data.message || `Failed to change publish status.`);
      }
    } catch (err) {
      alert('Error updating page publish status.');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-[#76b900] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 mt-4 font-bold text-sm">Generating sandboxed page preview...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-14 h-14 bg-red-950/50 border border-red-800 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={28} />
        </div>
        <h2 className="text-xl font-black">Unable to generate preview</h2>
        <p className="text-slate-400 text-sm mt-2 max-w-md">{error || 'Page not found.'}</p>
        <button
          onClick={() => navigate(`/store/${storeId}/custom-pages`)}
          className="mt-6 bg-[#76b900] hover:bg-[#639c00] text-white px-5 py-2.5 rounded-xl font-bold transition-all text-sm"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Compile standard HTML for iframe srcDoc
  const previewSource = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview: ${page.title}</title>
        ${page.headHTML || ''}
        <style>
          ${page.customCSS || ''}
        </style>
      </head>
      <body>
        ${page.bodyHTML || ''}
        <script>
          window.onerror = function(message, source, lineno, colno, error) {
            console.error(message + " on line " + lineno);
            return true;
          };
          try {
            ${page.customJS || ''}
          } catch(e) {
            console.error("Javascript Error: " + e.message);
          }
        </script>
      </body>
    </html>
  `;

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-slate-950">
      
      {/* Premium Sticky Control Bar */}
      <div className="bg-[#1e293b] text-white px-6 py-3 border-b border-slate-800 flex items-center justify-between shadow-lg z-30 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/store/${storeId}/custom-pages`)}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-100">{page.title}</span>
              <span className="bg-[#76b900]/15 text-[#76b900] text-[9px] font-black tracking-widest px-2 py-0.5 rounded border border-[#76b900]/20 uppercase">
                Preview Mode
              </span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${page.isPublished ? 'bg-green-900/40 text-green-400 border border-green-800/40' : 'bg-slate-700 text-slate-300'}`}>
                {page.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePublish}
            disabled={publishing}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95 ${
              page.isPublished 
                ? 'bg-slate-700 hover:bg-slate-600 text-white' 
                : 'bg-[#76b900] hover:bg-[#639c00] text-white shadow-md'
            }`}
          >
            {page.isPublished ? 'Unpublish' : 'Publish Page'}
          </button>

          <Link
            to={`/store/${storeId}/custom-pages/edit/${page._id}`}
            className="bg-slate-800 hover:bg-slate-700 text-[#76b900] border border-slate-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
          >
            <Edit2 size={12} />
            Edit Code
          </Link>
        </div>
      </div>

      {/* Render Frame */}
      <div className="flex-1 w-full bg-white relative">
        <iframe
          title={`Custom page preview frame: ${page.title}`}
          srcDoc={previewSource}
          sandbox="allow-scripts"
          className="w-full h-full border-none bg-white"
        />
      </div>

    </div>
  );
};

export default CustomPagePreview;

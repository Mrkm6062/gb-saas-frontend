import { API_BASE_URL } from '../api';
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import { 
  Plus, Edit2, Trash2, ArrowUp, ArrowDown, ChevronRight, 
  Save, Eye, EyeOff, Globe, Link as LinkIcon, FileText, Check, AlertCircle 
} from 'lucide-react';

const ManageCustomMenus = ({ token, stores, onLogout }) => {
  const { storeId } = useParams();
  const currentStore = stores.find(s => s.storeId === storeId) || {};

  // Data states
  const [menus, setMenus] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editor states
  const [selectedMenuId, setSelectedMenuId] = useState('');
  const [menuName, setMenuName] = useState('');
  const [menuItems, setMenuItems] = useState([]); // Array of nested menuItemSchema

  // Modal / Drawer state for adding/editing a menu item
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // add, edit
  const [modalItemPath, setModalItemPath] = useState([]); // array of indices pointing to the target item in tree
  const [modalLabel, setModalLabel] = useState('');
  const [modalLinkType, setModalLinkType] = useState('internal'); // internal, external
  const [modalPageId, setModalPageId] = useState('');
  const [modalUrl, setModalUrl] = useState('');
  const [modalTarget, setModalTarget] = useState('_self');
  const [modalVisible, setModalVisible] = useState(true);
  const [modalIcon, setModalIcon] = useState('');

  const fetchMenusAndPages = async () => {
    if (!currentStore._id) return;
    setLoading(true);
    setError('');
    try {
      // 1. Fetch menus
      const menuRes = await fetch(`${API_BASE_URL}/api/custom-menus/menus?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let menusData = [];
      if (menuRes.ok) {
        menusData = await menuRes.json();
        setMenus(menusData);
        if (menusData.length > 0 && !selectedMenuId) {
          selectMenu(menusData[0]);
        }
      }

      // 2. Fetch custom pages for internal link dropdown
      const pagesRes = await fetch(`${API_BASE_URL}/api/custom-pages/pages?storeId=${currentStore._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (pagesRes.ok) {
        setPages(await pagesRes.json());
      }
    } catch (e) {
      setError('Error loading navigation builders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenusAndPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStore._id]);

  const selectMenu = (menu) => {
    setSelectedMenuId(menu._id);
    setMenuName(menu.menuName);
    setMenuItems(menu.menuItems || []);
    setError('');
    setSuccess('');
  };

  const handleCreateNewMenu = () => {
    setSelectedMenuId('new');
    setMenuName('New Navigation Menu');
    setMenuItems([]);
    setError('');
    setSuccess('');
  };

  // Helper: Retrieve nested item by indices path in tree
  const getItemByPath = (items, path) => {
    let current = items;
    for (let i = 0; i < path.length; i++) {
      if (i === path.length - 1) {
        return current[path[i]];
      }
      current = current[path[i]].children;
    }
    return null;
  };

  // Helper: Deep copy tree
  const deepCopyTree = (arr) => JSON.parse(JSON.stringify(arr));

  // Helper: Update tree item
  const updateItemInTree = (items, path, updatedValues) => {
    const newItems = deepCopyTree(items);
    let current = newItems;
    for (let i = 0; i < path.length; i++) {
      if (i === path.length - 1) {
        current[path[i]] = { ...current[path[i]], ...updatedValues };
        break;
      }
      current = current[path[i]].children;
    }
    return newItems;
  };

  // Helper: Delete item from tree
  const deleteItemFromTree = (items, path) => {
    const newItems = deepCopyTree(items);
    let current = newItems;
    for (let i = 0; i < path.length; i++) {
      if (i === path.length - 1) {
        current.splice(path[i], 1);
        break;
      }
      current = current[path[i]].children;
    }
    return newItems;
  };

  // Helper: Add sub-item inside parent in tree
  const addSubItemToTree = (items, path, newItem) => {
    const newItems = deepCopyTree(items);
    let current = newItems;
    for (let i = 0; i < path.length; i++) {
      current = current[path[i]].children;
    }
    current.push(newItem);
    return newItems;
  };

  // Save changes to database
  const handleSaveMenu = async () => {
    if (!menuName.trim()) {
      setError('Menu Name is required.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      storeId: currentStore._id,
      menuName,
      menuItems
    };

    try {
      const url = selectedMenuId === 'new' 
        ? `${API_BASE_URL}/api/custom-menus/menu` 
        : `${API_BASE_URL}/api/custom-menus/menu/${selectedMenuId}`;
      const method = selectedMenuId === 'new' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved = await res.json();
        setSuccess('Navigation Menu saved successfully!');
        setSelectedMenuId(saved._id);
        
        // Refresh menus list
        const menuRes = await fetch(`${API_BASE_URL}/api/custom-menus/menus?storeId=${currentStore._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (menuRes.ok) {
          const list = await menuRes.json();
          setMenus(list);
          const currentSaved = list.find(m => m._id === saved._id);
          if (currentSaved) selectMenu(currentSaved);
        }
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to save menu');
      }
    } catch (e) {
      setError('Connection error. Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  // Delete Menu
  const handleDeleteMenu = async () => {
    if (selectedMenuId === 'new') {
      setSelectedMenuId('');
      if (menus.length > 0) selectMenu(menus[0]);
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete menu "${menuName}"? This will disable header links using this menu.`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/custom-menus/menu/${selectedMenuId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setSelectedMenuId('');
        const list = menus.filter(m => m._id !== selectedMenuId);
        setMenus(list);
        if (list.length > 0) selectMenu(list[0]);
        else handleCreateNewMenu();
      } else {
        alert('Failed to delete menu');
      }
    } catch (e) {
      alert('Connection error');
    }
  };

  // Reordering: move item up or down
  const handleMoveItem = (path, direction) => {
    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1];
    const newItems = deepCopyTree(menuItems);

    let list = newItems;
    for (let i = 0; i < parentPath.length; i++) {
      list = list[parentPath[i]].children;
    }

    const swapTarget = direction === 'up' ? index - 1 : index + 1;
    if (swapTarget < 0 || swapTarget >= list.length) return;

    // Swap elements
    const temp = list[index];
    list[index] = list[swapTarget];
    list[swapTarget] = temp;

    // Recalculate orders
    list.forEach((item, idx) => {
      item.order = idx;
    });

    setMenuItems(newItems);
  };

  // Open Modal for adding/editing
  const openModal = (mode, path) => {
    setModalMode(mode);
    setModalItemPath(path);

    if (mode === 'edit') {
      const item = getItemByPath(menuItems, path);
      if (item) {
        setModalLabel(item.label || '');
        setModalTarget(item.target || '_self');
        setModalVisible(item.visible !== false);
        setModalIcon(item.icon || '');
        
        if (item.pageId) {
          setModalLinkType('internal');
          setModalPageId(item.pageId._id || item.pageId);
          setModalUrl('');
        } else {
          setModalLinkType('external');
          setModalPageId('');
          setModalUrl(item.url || '');
        }
      }
    } else {
      // Add mode
      setModalLabel('');
      setModalLinkType('internal');
      setModalPageId(pages[0]?._id || '');
      setModalUrl('');
      setModalTarget('_self');
      setModalVisible(true);
      setModalIcon('');
    }
    setItemModalOpen(true);
  };

  // Modal Submit (Form add/update tree nodes)
  const handleModalSubmit = (e) => {
    e.preventDefault();

    if (!modalLabel.trim()) {
      alert('Label is required');
      return;
    }

    let itemUrl = modalUrl;
    let selectedPageObj = null;

    if (modalLinkType === 'internal') {
      const selectedPage = pages.find(p => p._id === modalPageId);
      if (selectedPage) {
        itemUrl = selectedPage.isHomepage ? '/' : `/${selectedPage.slug}`;
        selectedPageObj = selectedPage;
      }
    }

    const itemPayload = {
      label: modalLabel.trim(),
      url: itemUrl,
      pageId: modalLinkType === 'internal' ? modalPageId : null,
      target: modalTarget,
      visible: modalVisible,
      icon: modalIcon,
    };

    if (modalMode === 'add') {
      // Add root-level or child-level node
      const newItem = { ...itemPayload, children: [], order: 0 };
      
      if (modalItemPath.length === 0) {
        // Add root-level menu item
        const newItems = [...menuItems, newItem];
        newItems.forEach((item, idx) => { item.order = idx; });
        setMenuItems(newItems);
      } else {
        // Add child sub-item
        const updated = addSubItemToTree(menuItems, modalItemPath, newItem);
        setMenuItems(updated);
      }
    } else {
      // Edit mode: merge with existing item
      const updated = updateItemInTree(menuItems, modalItemPath, itemPayload);
      setMenuItems(updated);
    }

    setItemModalOpen(false);
  };

  // Delete item from tree
  const handleDeleteItem = (path) => {
    if (!window.confirm('Delete this menu item and all of its nested children sub-items?')) return;
    const updated = deleteItemFromTree(menuItems, path);
    setMenuItems(updated);
  };

  // Recursive Renderer for Tree Menu Nodes
  const renderMenuItems = (items, path = []) => {
    if (!items || items.length === 0) return null;

    return (
      <div className={`space-y-3 ${path.length > 0 ? 'pl-8 border-l border-slate-200 mt-3' : ''}`}>
        {items.map((item, idx) => {
          const currentPath = [...path, idx];
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-3 shadow-sm hover:border-slate-200">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                
                {/* Node details */}
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-white border rounded text-slate-400">
                    {item.pageId ? <FileText size={16} className="text-[#76b900]" /> : <LinkIcon size={16} className="text-blue-500" />}
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-800 text-sm">{item.label}</span>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5 max-w-[200px] truncate" title={item.url}>
                      Link: <code className="bg-white px-1 py-0.5 rounded">{item.url || '/'}</code>
                    </span>
                  </div>
                  {!item.visible && (
                    <span className="bg-slate-200 text-slate-600 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ml-2 flex items-center gap-0.5">
                      <EyeOff size={10} /> Hidden
                    </span>
                  )}
                </div>

                {/* Node Action Buttons */}
                <div className="flex items-center gap-1">
                  
                  {/* Reordering */}
                  <button
                    onClick={() => handleMoveItem(currentPath, 'up')}
                    disabled={idx === 0}
                    className="p-1 bg-white hover:bg-slate-100 border text-slate-500 disabled:opacity-30 rounded-lg transition"
                    title="Move Item Up"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMoveItem(currentPath, 'down')}
                    disabled={idx === items.length - 1}
                    className="p-1 bg-white hover:bg-slate-100 border text-slate-500 disabled:opacity-30 rounded-lg transition"
                    title="Move Item Down"
                  >
                    <ArrowDown size={14} />
                  </button>

                  <div className="w-px h-5 bg-slate-200 mx-1"></div>

                  {/* Add sub-item */}
                  <button
                    onClick={() => openModal('add', currentPath)}
                    className="px-2 py-1 bg-[#76b900]/10 hover:bg-[#76b900]/25 text-[#76b900] text-xs font-bold rounded-lg transition flex items-center gap-0.5"
                    title="Add Nested Link"
                  >
                    <Plus size={12} /> Sub
                  </button>
                  
                  {/* Edit */}
                  <button
                    onClick={() => openModal('edit', currentPath)}
                    className="p-1.5 bg-white hover:bg-blue-50 border border-slate-100 text-blue-600 rounded-lg transition"
                    title="Edit Link Settings"
                  >
                    <Edit2 size={13} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteItem(currentPath)}
                    className="p-1.5 bg-white hover:bg-red-50 border border-slate-100 text-red-600 rounded-lg transition"
                    title="Delete Link"
                  >
                    <Trash2 size={13} />
                  </button>

                </div>

              </div>
              
              {/* Children nodes (nested menu list) */}
              {renderMenuItems(item.children, currentPath)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AdminLayout stores={stores} onLogout={onLogout} headerTitle="Navigation Menu Builder">
      <div className="p-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Select Menu Card */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div>
              <h2 className="font-black text-slate-800 text-base">Menus & Structures</h2>
              <p className="text-xs text-slate-400 mt-1">Select an existing menu to edit or create a new one.</p>
            </div>

            <button
              onClick={handleCreateNewMenu}
              className="w-full bg-[#f1f8e9] hover:bg-[#e4f3d4] text-[#76b900] font-bold py-2.5 rounded-xl text-xs transition border border-dashed border-[#76b900]/30 flex items-center justify-center gap-1.5"
            >
              <Plus size={14} /> Create New Menu
            </button>

            <div className="space-y-2 border-t border-slate-100 pt-4 max-h-80 overflow-y-auto">
              {menus.map((menu) => (
                <button
                  key={menu._id}
                  onClick={() => selectMenu(menu)}
                  className={`w-full text-left p-3 rounded-xl font-bold text-xs transition flex items-center justify-between border ${
                    selectedMenuId === menu._id
                      ? 'bg-[#76b900] text-white border-transparent shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-100'
                  }`}
                >
                  <span className="truncate">{menu.menuName}</span>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Builder Workspace */}
        <div className="lg:col-span-2 space-y-6">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl flex items-center gap-3">
              <Check size={20} className="shrink-0" />
              <span className="text-sm font-medium">{success}</span>
            </div>
          )}

          {selectedMenuId ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              
              {/* Menu Title controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex-1">
                  <label className="block text-slate-400 text-[10px] font-black uppercase tracking-wider">Menu Name / Label</label>
                  <input
                    type="text"
                    value={menuName}
                    onChange={(e) => setMenuName(e.target.value)}
                    placeholder="e.g. Main Header Navigation"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#76b900]"
                  />
                </div>
                <div className="flex items-center gap-2 self-end">
                  <button
                    onClick={handleDeleteMenu}
                    className="px-4 py-2 border border-red-100 hover:bg-red-50 text-red-600 rounded-xl text-xs font-bold transition"
                  >
                    Delete Menu
                  </button>
                  <button
                    onClick={handleSaveMenu}
                    disabled={saving}
                    className="bg-[#76b900] hover:bg-[#639c00] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md active:translate-y-0 disabled:opacity-50"
                  >
                    <Save size={14} />
                    {saving ? 'Saving...' : 'Save Navigation'}
                  </button>
                </div>
              </div>

              {/* Menu Links hierarchy list */}
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="font-black text-slate-800 text-sm">Menu Links Hierarchy</h3>
                  <button
                    onClick={() => openModal('add', [])}
                    className="bg-[#76b900] hover:bg-[#639c00] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Menu Item
                  </button>
                </div>

                {menuItems.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                    <p className="text-slate-400 text-xs">No links added to this menu yet.</p>
                    <button
                      onClick={() => openModal('add', [])}
                      className="mt-3 bg-white border hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition"
                    >
                      Create First Link
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {renderMenuItems(menuItems)}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 shadow-sm text-center">
              <p className="text-slate-400 text-sm">Please select a menu or create a new one to begin editing.</p>
            </div>
          )}

        </div>

      </div>

      {/* Slide-in item editing modal backdrop */}
      {itemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden text-left border border-slate-100">
            <div className="p-5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wider">
                {modalMode === 'add' ? 'Add Link Item' : 'Edit Link Settings'}
              </h3>
              <button 
                onClick={() => setItemModalOpen(false)} 
                className="text-slate-400 hover:text-red-500 font-black text-sm"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="p-5 space-y-4">
              
              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase">Navigation Label *</label>
                <input
                  type="text"
                  required
                  value={modalLabel}
                  onChange={(e) => setModalLabel(e.target.value)}
                  placeholder="e.g. About Us"
                  className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[10px] font-bold uppercase">Link Source Type</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
                    <input
                      type="radio"
                      name="linkType"
                      checked={modalLinkType === 'internal'}
                      onChange={() => setModalLinkType('internal')}
                      className="accent-[#76b900]"
                    />
                    Internal Custom Page
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold">
                    <input
                      type="radio"
                      name="linkType"
                      checked={modalLinkType === 'external'}
                      onChange={() => setModalLinkType('external')}
                      className="accent-[#76b900]"
                    />
                    External Custom URL
                  </label>
                </div>
              </div>

              {modalLinkType === 'internal' ? (
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase">Pick Internal Page *</label>
                  {pages.length === 0 ? (
                    <p className="text-slate-400 text-xs mt-2 italic">No custom pages created. Create a custom page first.</p>
                  ) : (
                    <select
                      value={modalPageId}
                      onChange={(e) => setModalPageId(e.target.value)}
                      className="w-full mt-1.5 p-2 bg-slate-50 border rounded-lg text-sm text-slate-700"
                    >
                      <option value="">-- Choose a page --</option>
                      {pages.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.title} (/{p.slug})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase">URL / Endpoint Link *</label>
                  <input
                    type="text"
                    value={modalUrl}
                    onChange={(e) => setModalUrl(e.target.value)}
                    placeholder="e.g. https://google.com or /contact"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase">Target Window</label>
                  <select
                    value={modalTarget}
                    onChange={(e) => setModalTarget(e.target.value)}
                    className="w-full mt-1.5 p-2 bg-slate-50 border rounded-lg text-sm text-slate-700"
                  >
                    <option value="_self">Same tab (_self)</option>
                    <option value="_blank">New tab (_blank)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] font-bold uppercase">Icon Name (Optional)</label>
                  <input
                    type="text"
                    value={modalIcon}
                    onChange={(e) => setModalIcon(e.target.value)}
                    placeholder="e.g. heart, phone"
                    className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2 pt-2">
                <input
                  id="modalVisible"
                  type="checkbox"
                  checked={modalVisible}
                  onChange={(e) => setModalVisible(e.target.checked)}
                  className="mt-1 accent-[#76b900]"
                />
                <label htmlFor="modalVisible">
                  <span className="block text-xs font-bold text-slate-700">Visible in Layout</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">Toggle off to hide this menu item without deleting it.</span>
                </label>
              </div>

              <div className="border-t border-slate-100 pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold hover:bg-slate-50 text-slate-600 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#76b900] hover:bg-[#639c00] text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-sm"
                >
                  {modalMode === 'add' ? 'Add Item' : 'Update Item'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </AdminLayout>
  );
};

export default ManageCustomMenus;

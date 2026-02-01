import React, { useState, useEffect } from 'react';
import { Camera, ShoppingBag, Trash2, Edit2, LogOut, Lock, X, Plus, Archive, ChevronLeft, ChevronRight, Search, TrendingUp, DollarSign, Package, Sun, Moon, ZoomIn, Instagram } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration
const supabaseUrl = 'https://gfgczrhmsrbnzisogiev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZ2N6cmhtc3Jibnppc29naWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTI4NjEsImV4cCI6MjA4NTM2ODg2MX0.YyU4_kXEEYonjPpfJRBWPw7KNknC7LT0ZsIYz0OOZOM';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const WHATSAPP_NUMBER = '221711248897';
const INSTAGRAM_HANDLE = 'hott_vintage221';
const CATEGORIES = ['Tous', 'Homme', 'Femme', 'Enfant', 'Accessoires'];

const App = () => {
  const [products, setProducts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [view, setView] = useState('home');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tous');
  const [sortBy, setSortBy] = useState('recent');
  const [zoomedImage, setZoomedImage] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    size: '',
    brand: '',
    condition: '',
    category: 'Accessoires',
    images: [],
    sold: false,
    reference: ''
  });

  // Check auth status on mount
  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setIsAdmin(true);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      setIsAdmin(true);
    }
  };

  // Load products with OPTIMIZED realtime
  useEffect(() => {
    loadProducts();
    
    // OPTIMIZED: Update only changed items instead of reloading everything
    const subscription = supabase
      .channel('products_channel')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'products' 
      }, payload => {
        const newProduct = {
          ...payload.new,
          images: payload.new.images ? JSON.parse(payload.new.images) : []
        };
        setProducts(prev => [newProduct, ...prev]);
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'products' 
      }, payload => {
        const updatedProduct = {
          ...payload.new,
          images: payload.new.images ? JSON.parse(payload.new.images) : []
        };
        setProducts(prev => prev.map(p => p.id === payload.new.id ? updatedProduct : p));
      })
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'products' 
      }, payload => {
        setProducts(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading products:', error);
    } else {
      const parsedProducts = (data || []).map(product => ({
        ...product,
        images: product.images ? JSON.parse(product.images) : []
      }));
      setProducts(parsedProducts);
    }
  };

  const generateReference = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `REF-${timestamp}`;
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Email et mot de passe requis');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        alert('Erreur de connexion : ' + error.message);
      } else {
        setUser(data.user);
        setIsAdmin(true);
        setShowLogin(false);
        setEmail('');
        setPassword('');
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setShowStats(false);
  };

  // OPTIMIZED: Compress images before upload
  const compressImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max width 1200px
          const maxWidth = 1200;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
          }, 'image/jpeg', 0.85);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const uploadImages = async (files) => {
    const uploadedUrls = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      setUploadProgress(`Compression de ${i + 1}/${files.length}...`);
      const compressedFile = await compressImage(file);
      
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      setUploadProgress(`Upload de ${i + 1}/${files.length}...`);

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, compressedFile);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const handleImageUpload = async (e, isEditing = false) => {
    const files = Array.from(e.target.files);
    
    // Limit to 5 images
    if (files.length > 5) {
      alert('Maximum 5 photos par article');
      return;
    }
    
    setUploading(true);
    setUploadProgress(`Préparation...`);

    try {
      const imageUrls = await uploadImages(files);

      if (isEditing && editingProduct) {
        setEditingProduct({
          ...editingProduct,
          images: [...editingProduct.images, ...imageUrls].slice(0, 5)
        });
      } else {
        setNewProduct({
          ...newProduct,
          images: [...newProduct.images, ...imageUrls].slice(0, 5)
        });
      }
      
      setUploadProgress('');
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Erreur lors du téléchargement des images');
      setUploadProgress('');
    } finally {
      setUploading(false);
    }
  };

  const addProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      alert('Nom et prix sont obligatoires');
      return;
    }

    if (newProduct.images.length === 0) {
      alert('Ajoutez au moins une photo');
      return;
    }

    try {
      const productData = {
        name: newProduct.name,
        price: newProduct.price,
        size: newProduct.size,
        brand: newProduct.brand,
        condition: newProduct.condition,
        category: newProduct.category,
        images: JSON.stringify(newProduct.images),
        reference: generateReference(),
        sold: false,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('products')
        .insert([productData]);

      if (error) throw error;
      
      setNewProduct({
        name: '',
        price: '',
        size: '',
        brand: '',
        condition: '',
        category: 'Accessoires',
        images: [],
        sold: false,
        reference: ''
      });
      setShowAddModal(false);
      alert('Article ajouté avec succès !');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Erreur lors de l\'ajout de l\'article');
    }
  };

  const updateProduct = async () => {
    try {
      const { id, created_at, ...updateData } = editingProduct;
      
      const dataToUpdate = {
        ...updateData,
        images: JSON.stringify(updateData.images)
      };
      
      const { error } = await supabase
        .from('products')
        .update(dataToUpdate)
        .eq('id', id);

      if (error) throw error;

      setEditingProduct(null);
      alert('Article modifié avec succès !');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Erreur lors de la modification');
    }
  };

  const deleteProduct = async (id) => {
    if (window.confirm('Supprimer cet article ?')) {
      try {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (error) throw error;
        alert('Article supprimé !');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Erreur lors de la suppression');
      }
    }
  };

  const toggleSold = async (product) => {
    // Confirmation popup
    if (!window.confirm(`Marquer cet article comme ${product.sold ? 'disponible' : 'vendu'} ?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('products')
        .update({ sold: !product.sold })
        .eq('id', product.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error toggling sold status:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const removeImage = (index, isEditing = false) => {
    if (isEditing && editingProduct) {
      setEditingProduct({
        ...editingProduct,
        images: editingProduct.images.filter((_, i) => i !== index)
      });
    } else {
      setNewProduct({
        ...newProduct,
        images: newProduct.images.filter((_, i) => i !== index)
      });
    }
  };

  const sendWhatsApp = (product) => {
    const message = `Bonjour, je suis intéressé(e) par ${product.name} (${product.reference}) à ${product.price} FCFA`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const nextImage = (productId) => {
    const product = products.find(p => p.id === productId);
    const maxIndex = product.images.length - 1;
    setCurrentImageIndex(prev => ({
      ...prev,
      [productId]: Math.min((prev[productId] || 0) + 1, maxIndex)
    }));
  };

  const prevImage = (productId) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [productId]: Math.max((prev[productId] || 0) - 1, 0)
    }));
  };

  // Filter and sort products
  const getFilteredProducts = () => {
    let filtered = products;

    // Filter by category
    if (selectedCategory !== 'Tous') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.size?.toLowerCase().includes(query) ||
        p.reference?.toLowerCase().includes(query)
      );
    }

    // Sort
    switch (sortBy) {
      case 'price_asc':
        filtered.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case 'price_desc':
        filtered.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case 'brand':
        filtered.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
        break;
      case 'recent':
      default:
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    return filtered;
  };

  const availableProducts = getFilteredProducts().filter(p => !p.sold);
  const soldProducts = getFilteredProducts().filter(p => p.sold);

  // Statistics
  const getStats = () => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const soldThisMonth = products.filter(p => 
      p.sold && new Date(p.created_at) >= firstDayOfMonth
    );
    
    const totalRevenue = soldThisMonth.reduce((sum, p) => 
      sum + (parseFloat(p.price) || 0), 0
    );
    
    const popularProducts = products
      .filter(p => p.sold)
      .slice(0, 3);

    return {
      soldCount: soldThisMonth.length,
      totalRevenue,
      popularProducts,
      totalProducts: products.length,
      availableCount: products.filter(p => !p.sold).length
    };
  };

  const stats = getStats();

  // Theme colors
  const theme = {
    bg: darkMode ? '#1a1a1a' : '#f5f5f5',
    bgGradient: darkMode 
      ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)'
      : 'linear-gradient(135deg, #ffffff 0%, #f0f0f0 100%)',
    text: darkMode ? '#f5f5f5' : '#1a1a1a',
    textMuted: darkMode ? '#999' : '#666',
    cardBg: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    border: darkMode ? 'rgba(218,165,32,0.2)' : 'rgba(218,165,32,0.3)',
    headerBg: darkMode ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
    inputBg: darkMode ? '#1a1a1a' : '#ffffff',
    inputBorder: darkMode ? '#666' : '#ddd',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.bgGradient,
      color: theme.text,
      fontFamily: '"Playfair Display", serif',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <header style={{
        background: theme.headerBg,
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${theme.border}`,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '1.5rem 2rem',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ShoppingBag size={32} color="#DAA520" />
            <div>
              <h1 
                onClick={() => setView('home')}
                style={{
                  margin: 0,
                  fontSize: '2rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '2px',
                  cursor: 'pointer'
                }}
              >
                HOTT VINTAGE
              </h1>
              <p style={{ margin: 0, fontSize: '0.9rem', color: theme.textMuted, fontFamily: 'Arial' }}>
                Friperie Premium · Dakar
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              style={{
                background: 'transparent',
                border: `1px solid ${theme.border}`,
                padding: '0.5rem',
                borderRadius: '8px',
                color: theme.text,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.3s ease'
              }}
              title={darkMode ? 'Mode clair' : 'Mode sombre'}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {isAdmin && user ? (
              <>
                {showStats ? (
                  <button
                    onClick={() => setShowStats(false)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #666',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      color: theme.text,
                      cursor: 'pointer',
                      fontFamily: 'Arial'
                    }}
                  >
                    ← Retour
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowStats(true)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #DAA520',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        color: '#DAA520',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontFamily: 'Arial'
                      }}
                    >
                      <TrendingUp size={20} />
                      Stats
                    </button>
                    <button
                      onClick={() => setShowAddModal(true)}
                      style={{
                        background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                        border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '8px',
                        color: '#000',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontFamily: 'Arial'
                      }}
                    >
                      <Plus size={20} />
                      Ajouter
                    </button>
                  </>
                )}
                <button
                  onClick={handleLogout}
                  style={{
                    background: 'transparent',
                    border: '1px solid #666',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    color: theme.text,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontFamily: 'Arial'
                  }}
                >
                  <LogOut size={20} />
                  Déconnexion
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLogin(true)}
                style={{
                  background: 'transparent',
                  border: '1px solid #DAA520',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  color: '#DAA520',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontFamily: 'Arial'
                }}
              >
                <Lock size={20} />
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Statistics Dashboard */}
      {showStats && isAdmin ? (
        <div style={{
          maxWidth: '1400px',
          margin: '2rem auto',
          padding: '0 2rem'
        }}>
          <h2 style={{
            fontSize: '2rem',
            marginBottom: '2rem',
            color: '#DAA520'
          }}>
            📊 Statistiques
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              background: theme.cardBg,
              padding: '2rem',
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <DollarSign size={32} color="#27ae60" />
                <div>
                  <div style={{ fontSize: '0.85rem', color: theme.textMuted, fontFamily: 'Arial' }}>
                    Revenus ce mois
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#27ae60', fontFamily: 'Arial' }}>
                    {stats.totalRevenue.toLocaleString()} FCFA
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: theme.cardBg,
              padding: '2rem',
              borderRadius: '12px',
              border: `1px solid ${theme.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <Package size={32} color="#3498db" />
                <div>
                  <div style={{ fontSize: '0.85rem', color: theme.textMuted, fontFamily: 'Arial' }}>
                    Articles vendus ce mois
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#3498db', fontFamily: 'Arial' }}>
                    {stats.soldCount}
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              background: theme.cardBg,
              padding: '2rem',
              borderRadius: '12px',
              border: `1px solid ${theme.border}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                <ShoppingBag size={32} color="#DAA520" />
                <div>
                  <div style={{ fontSize: '0.85rem', color: theme.textMuted, fontFamily: 'Arial' }}>
                    Articles disponibles
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#DAA520', fontFamily: 'Arial' }}>
                    {stats.availableCount}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {stats.popularProducts.length > 0 && (
            <div style={{
              background: theme.cardBg,
              padding: '2rem',
              borderRadius: '12px',
              border: `1px solid ${theme.border}`
            }}>
              <h3 style={{ marginTop: 0, color: '#DAA520', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={24} />
                Articles populaires
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {stats.popularProducts.map((product, idx) => (
                  <div key={product.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '1rem',
                    background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    borderRadius: '8px'
                  }}>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: 700,
                      color: '#DAA520',
                      width: '40px',
                      textAlign: 'center'
                    }}>
                      #{idx + 1}
                    </div>
                    {product.images && product.images[0] && (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        style={{
                          width: '60px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '8px'
                        }}
                      />
                    )}
                    <div style={{ flex: 1, fontFamily: 'Arial' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{product.name}</div>
                      <div style={{ fontSize: '0.9rem', color: theme.textMuted }}>
                        {product.price} FCFA {product.brand && `· ${product.brand}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : view === 'home' ? (
        /* HOME PAGE */
        <>
          {/* Hero Banner */}
          <div style={{
            background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
            padding: '4rem 2rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              maxWidth: '800px',
              margin: '0 auto',
              position: 'relative',
              zIndex: 1
            }}>
              <h2 style={{
                fontSize: '3rem',
                fontWeight: 700,
                color: '#000',
                margin: '0 0 1rem 0',
                textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                animation: 'fadeInUp 0.6s ease-out'
              }}>
                LES MEILLEURES PIÈCES VINTAGE DE DAKAR
              </h2>
              <p style={{
                fontSize: '1.2rem',
                color: '#1a1a1a',
                margin: '0 0 2rem 0',
                fontFamily: 'Arial',
                animation: 'fadeInUp 0.8s ease-out'
              }}>
                Découvrez notre collection unique de vêtements vintage sélectionnés avec soin
              </p>
              <button
                onClick={() => setView('products')}
                style={{
                  background: '#000',
                  color: '#FFD700',
                  border: 'none',
                  padding: '1rem 3rem',
                  borderRadius: '50px',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Arial',
                  transition: 'all 0.3s ease',
                  animation: 'fadeInUp 1s ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Découvrir la collection
              </button>
            </div>
            
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '200px',
              height: '200px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%',
              animation: 'float 6s ease-in-out infinite'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '150px',
              height: '150px',
              background: 'rgba(0,0,0,0.1)',
              borderRadius: '50%',
              animation: 'float 4s ease-in-out infinite'
            }} />
          </div>

          {/* Nouveautés Section */}
          <div style={{
            maxWidth: '1400px',
            margin: '4rem auto',
            padding: '0 2rem'
          }}>
            <h2 style={{
              fontSize: '2.5rem',
              marginBottom: '2rem',
              color: '#DAA520',
              textAlign: 'center'
            }}>
              ✨ Nouveautés de la semaine
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1.5rem'
            }}>
              {availableProducts.slice(0, 8).map((product) => {
                const currentIndex = currentImageIndex[product.id] || 0;
                return (
                  <div
                    key={product.id}
                    style={{
                      background: theme.cardBg,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: `1px solid ${theme.border}`,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      animation: 'fadeIn 0.5s ease-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)';
                      e.currentTarget.style.boxShadow = '0 20px 40px rgba(218,165,32,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ position: 'relative', paddingTop: '100%', background: '#000' }}>
                      {product.images && product.images.length > 0 ? (
                        <>
                          <img
                            src={product.images[currentIndex]}
                            alt={product.name}
                            loading="lazy"
                            onClick={() => setZoomedImage(product.images[currentIndex])}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              cursor: 'zoom-in'
                            }}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage(product.images[currentIndex]);
                            }}
                            style={{
                              position: 'absolute',
                              top: '0.5rem',
                              right: '0.5rem',
                              background: 'rgba(0,0,0,0.6)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#fff'
                            }}
                          >
                            <ZoomIn size={16} />
                          </button>
                        </>
                      ) : (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(218,165,32,0.1)'
                        }}>
                          <Camera size={48} color="#666" />
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '1rem' }}>
                      <div style={{
                        fontSize: '0.7rem',
                        color: '#DAA520',
                        fontFamily: 'Arial',
                        marginBottom: '0.25rem',
                        fontWeight: 600
                      }}>
                        {product.reference}
                      </div>
                      
                      <h3 style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '1.1rem',
                        color: '#DAA520'
                      }}>
                        {product.name}
                      </h3>
                      
                      <div style={{
                        fontFamily: 'Arial',
                        fontSize: '0.8rem',
                        color: theme.textMuted,
                        marginBottom: '0.75rem'
                      }}>
                        {product.brand && <div>Marque: {product.brand}</div>}
                        {product.size && <div>Taille: {product.size}</div>}
                        {product.condition && <div>État: {product.condition}</div>}
                      </div>

                      <div style={{
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        color: '#FFD700',
                        marginBottom: '0.75rem',
                        fontFamily: 'Arial'
                      }}>
                        {product.price} FCFA
                      </div>

                      <button
                        onClick={() => sendWhatsApp(product)}
                        style={{
                          width: '100%',
                          background: '#25D366',
                          border: 'none',
                          padding: '0.6rem',
                          borderRadius: '8px',
                          color: '#fff',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontFamily: 'Arial',
                          fontSize: '0.85rem',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#128C7E'}
                        onMouseLeave={(e) => e.currentTarget.style.background = '#25D366'}
                      >
                        Commander sur WhatsApp
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem' }}>
              <button
                onClick={() => setView('products')}
                style={{
                  background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                  border: 'none',
                  padding: '1rem 3rem',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Arial',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                Voir toute la collection →
              </button>
            </div>
          </div>
        </>
      ) : (
        /* PRODUCTS PAGE */
        <>
          {/* Search and Filters */}
          <div style={{
            maxWidth: '1400px',
            margin: '2rem auto',
            padding: '0 2rem'
          }}>
            {/* Search Bar */}
            <div style={{
              background: theme.cardBg,
              padding: '1rem',
              borderRadius: '12px',
              border: `1px solid ${theme.border}`,
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <Search size={20} color={theme.textMuted} />
              <input
                type="text"
                placeholder="Rechercher par nom, marque, taille, référence..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: '1rem',
                  color: theme.text,
                  fontFamily: 'Arial'
                }}
              />
              {searchQuery && (
                <X
                  size={20}
                  color={theme.textMuted}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSearchQuery('')}
                />
              )}
            </div>

            {/* Categories */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.5rem',
              flexWrap: 'wrap'
            }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    background: selectedCategory === cat 
                      ? 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)'
                      : 'transparent',
                    border: selectedCategory === cat ? 'none' : `1px solid ${theme.border}`,
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    color: selectedCategory === cat ? '#000' : theme.text,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Arial',
                    fontSize: '0.95rem',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Sort and View Toggle */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <label style={{ fontFamily: 'Arial', color: theme.textMuted }}>
                  Trier par:
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: `1px solid ${theme.inputBorder}`,
                    background: theme.inputBg,
                    color: theme.text,
                    fontFamily: 'Arial',
                    cursor: 'pointer'
                  }}
                >
                  <option value="recent">Plus récents</option>
                  <option value="price_asc">Prix croissant</option>
                  <option value="price_desc">Prix décroissant</option>
                  <option value="brand">Par marque</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={() => setView('products')}
                  style={{
                    background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                    border: 'none',
                    padding: '0.75rem 2rem',
                    borderRadius: '8px',
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Arial',
                    fontSize: '1rem'
                  }}
                >
                  Disponibles ({availableProducts.length})
                </button>
                <button
                  onClick={() => setView('sold')}
                  style={{
                    background: 'transparent',
                    border: '1px solid #666',
                    padding: '0.75rem 2rem',
                    borderRadius: '8px',
                    color: theme.text,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Arial',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <Archive size={20} />
                  Vendus ({soldProducts.length})
                </button>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          <div style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '2rem',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '1.5rem'
          }}>
            {(view === 'sold' ? soldProducts : availableProducts).length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '4rem 2rem',
                color: theme.textMuted,
                fontFamily: 'Arial'
              }}>
                <ShoppingBag size={64} color={theme.textMuted} style={{ margin: '0 auto 1rem' }} />
                <p style={{ fontSize: '1.2rem', margin: 0 }}>
                  {searchQuery || selectedCategory !== 'Tous' 
                    ? 'Aucun article trouvé avec ces filtres'
                    : 'Aucun article disponible'}
                </p>
              </div>
            ) : (
              (view === 'sold' ? soldProducts : availableProducts).map(product => {
                const currentIndex = currentImageIndex[product.id] || 0;
                return (
                  <div
                    key={product.id}
                    style={{
                      background: theme.cardBg,
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: `1px solid ${theme.border}`,
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      animation: 'fadeIn 0.5s ease-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)';
                      e.currentTarget.style.boxShadow = '0 20px 40px rgba(218,165,32,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {/* Image Carousel */}
                    <div style={{ position: 'relative', paddingTop: '100%', background: '#000' }}>
                      {product.images && product.images.length > 0 ? (
                        <>
                          <img
                            src={product.images[currentIndex]}
                            alt={product.name}
                            loading="lazy"
                            onClick={() => setZoomedImage(product.images[currentIndex])}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              cursor: 'zoom-in'
                            }}
                          />
                          {product.images.length > 1 && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  prevImage(product.id);
                                }}
                                style={{
                                  position: 'absolute',
                                  left: '0.5rem',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'rgba(0,0,0,0.6)',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: '#fff',
                                  opacity: currentIndex === 0 ? 0.3 : 1,
                                  transition: 'opacity 0.3s ease'
                                }}
                                disabled={currentIndex === 0}
                              >
                                <ChevronLeft size={20} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  nextImage(product.id);
                                }}
                                style={{
                                  position: 'absolute',
                                  right: '0.5rem',
                                  top: '50%',
                                  transform: 'translateY(-50%)',
                                  background: 'rgba(0,0,0,0.6)',
                                  border: 'none',
                                  borderRadius: '50%',
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer',
                                  color: '#fff',
                                  opacity: currentIndex === product.images.length - 1 ? 0.3 : 1,
                                  transition: 'opacity 0.3s ease'
                                }}
                                disabled={currentIndex === product.images.length - 1}
                              >
                                <ChevronRight size={20} />
                              </button>
                              <div style={{
                                position: 'absolute',
                                bottom: '0.5rem',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(0,0,0,0.6)',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                color: '#fff',
                                fontFamily: 'Arial'
                              }}>
                                {currentIndex + 1} / {product.images.length}
                              </div>
                            </>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setZoomedImage(product.images[currentIndex]);
                            }}
                            style={{
                              position: 'absolute',
                              top: '0.5rem',
                              right: '0.5rem',
                              background: 'rgba(0,0,0,0.6)',
                              border: 'none',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#fff'
                            }}
                          >
                            <ZoomIn size={16} />
                          </button>
                        </>
                      ) : (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: 'rgba(218,165,32,0.1)'
                        }}>
                          <Camera size={48} color="#666" />
                        </div>
                      )}
                      {product.sold && (
                        <div style={{
                          position: 'absolute',
                          top: '0.5rem',
                          left: '0.5rem',
                          background: '#e74c3c',
                          color: '#fff',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '6px',
                          fontWeight: 700,
                          fontFamily: 'Arial',
                          fontSize: '0.75rem'
                        }}>
                          VENDU
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1rem' }}>
                      <div style={{
                        fontSize: '0.7rem',
                        color: '#DAA520',
                        fontFamily: 'Arial',
                        marginBottom: '0.25rem',
                        fontWeight: 600
                      }}>
                        {product.reference} · {product.category}
                      </div>
                      
                      <h3 style={{
                        margin: '0 0 0.5rem 0',
                        fontSize: '1.1rem',
                        color: '#DAA520'
                      }}>
                        {product.name}
                      </h3>
                      
                      <div style={{
                        fontFamily: 'Arial',
                        fontSize: '0.8rem',
                        color: theme.textMuted,
                        marginBottom: '0.75rem'
                      }}>
                        {product.brand && <div>Marque: {product.brand}</div>}
                        {product.size && <div>Taille: {product.size}</div>}
                        {product.condition && <div>État: {product.condition}</div>}
                      </div>

                      <div style={{
                        fontSize: '1.3rem',
                        fontWeight: 700,
                        color: '#FFD700',
                        marginBottom: '0.75rem',
                        fontFamily: 'Arial'
                      }}>
                        {product.price} FCFA
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {!product.sold && (
                          <button
                            onClick={() => sendWhatsApp(product)}
                            style={{
                              flex: 1,
                              background: '#25D366',
                              border: 'none',
                              padding: '0.6rem',
                              borderRadius: '8px',
                              color: '#fff',
                              fontWeight: 600,
                              cursor: 'pointer',
                              fontFamily: 'Arial',
                              fontSize: '0.85rem',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#128C7E'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#25D366'}
                          >
                            Commander
                          </button>
                        )}
                        
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => toggleSold(product)}
                              style={{
                                flex: 1,
                                background: product.sold ? '#27ae60' : '#e67e22',
                                border: 'none',
                                padding: '0.6rem',
                                borderRadius: '8px',
                                color: '#fff',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'Arial',
                                fontSize: '0.85rem',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              {product.sold ? 'Disponible' : 'Vendu'}
                            </button>
                            <button
                              onClick={() => setEditingProduct(product)}
                              style={{
                                background: '#3498db',
                                border: 'none',
                                padding: '0.6rem',
                                borderRadius: '8px',
                                color: '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => deleteProduct(product.id)}
                              style={{
                                background: '#e74c3c',
                                border: 'none',
                                padding: '0.6rem',
                                borderRadius: '8px',
                                color: '#fff',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          onClick={() => setZoomedImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '2rem',
            cursor: 'zoom-out',
            animation: 'fadeIn 0.3s ease-out'
          }}
        >
          <button
            onClick={() => setZoomedImage(null)}
            style={{
              position: 'absolute',
              top: '2rem',
              right: '2rem',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '2rem'
            }}
          >
            <X size={32} />
          </button>
          <img
            src={zoomedImage}
            alt="Zoom"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              objectFit: 'contain',
              borderRadius: '12px',
              cursor: 'default'
            }}
          />
        </div>
      )}

      {/* Login Modal */}
      {showLogin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: theme.cardBg,
            padding: '2rem',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '400px',
            border: `1px solid ${theme.border}`,
            animation: 'slideInUp 0.3s ease-out'
          }}>
            <h2 style={{ marginTop: 0, color: '#DAA520' }}>Connexion Admin</h2>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '1rem',
                borderRadius: '8px',
                border: `1px solid ${theme.inputBorder}`,
                background: theme.inputBg,
                color: theme.text,
                fontFamily: 'Arial',
                fontSize: '1rem'
              }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Mot de passe"
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '1rem',
                borderRadius: '8px',
                border: `1px solid ${theme.inputBorder}`,
                background: theme.inputBg,
                color: theme.text,
                fontFamily: 'Arial',
                fontSize: '1rem'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleLogin}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: isLoading ? '#666' : 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                  border: 'none',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  color: isLoading ? '#999' : '#000',
                  fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Arial',
                  transition: 'all 0.3s ease'
                }}
              >
                {isLoading ? 'Connexion...' : 'Connexion'}
              </button>
              <button
                onClick={() => {
                  setShowLogin(false);
                  setEmail('');
                  setPassword('');
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid #666',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  color: theme.text,
                  cursor: 'pointer',
                  fontFamily: 'Arial',
                  transition: 'all 0.3s ease'
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {(showAddModal || editingProduct) && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          overflowY: 'auto',
          padding: '2rem',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{
            background: theme.cardBg,
            padding: '2rem',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '600px',
            border: `1px solid ${theme.border}`,
            maxHeight: '90vh',
            overflowY: 'auto',
            animation: 'slideInUp 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, color: '#DAA520' }}>
                {editingProduct ? 'Modifier l\'article' : 'Nouvel article'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#999',
                  cursor: 'pointer'
                }}
              >
                <X size={24} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <input
                type="text"
                placeholder="Nom de l'article *"
                value={editingProduct ? editingProduct.name : newProduct.name}
                onChange={(e) => editingProduct 
                  ? setEditingProduct({...editingProduct, name: e.target.value})
                  : setNewProduct({...newProduct, name: e.target.value})
                }
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.text,
                  fontFamily: 'Arial',
                  fontSize: '1rem'
                }}
              />

              <input
                type="text"
                placeholder="Prix (FCFA) *"
                value={editingProduct ? editingProduct.price : newProduct.price}
                onChange={(e) => editingProduct
                  ? setEditingProduct({...editingProduct, price: e.target.value})
                  : setNewProduct({...newProduct, price: e.target.value})
                }
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.text,
                  fontFamily: 'Arial',
                  fontSize: '1rem'
                }}
              />

              <select
                value={editingProduct ? editingProduct.category : newProduct.category}
                onChange={(e) => editingProduct
                  ? setEditingProduct({...editingProduct, category: e.target.value})
                  : setNewProduct({...newProduct, category: e.target.value})
                }
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.text,
                  fontFamily: 'Arial',
                  fontSize: '1rem',
                  cursor: 'pointer'
                }}
              >
                {CATEGORIES.filter(c => c !== 'Tous').map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Taille (ex: M, L, 38...)"
                value={editingProduct ? editingProduct.size : newProduct.size}
                onChange={(e) => editingProduct
                  ? setEditingProduct({...editingProduct, size: e.target.value})
                  : setNewProduct({...newProduct, size: e.target.value})
                }
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.text,
                  fontFamily: 'Arial',
                  fontSize: '1rem'
                }}
              />

              <input
                type="text"
                placeholder="Marque"
                value={editingProduct ? editingProduct.brand : newProduct.brand}
                onChange={(e) => editingProduct
                  ? setEditingProduct({...editingProduct, brand: e.target.value})
                  : setNewProduct({...newProduct, brand: e.target.value})
                }
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.text,
                  fontFamily: 'Arial',
                  fontSize: '1rem'
                }}
              />

              <input
                type="text"
                placeholder="État (ex: Excellent, Bon, Très bon...)"
                value={editingProduct ? editingProduct.condition : newProduct.condition}
                onChange={(e) => editingProduct
                  ? setEditingProduct({...editingProduct, condition: e.target.value})
                  : setNewProduct({...newProduct, condition: e.target.value})
                }
                style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: `1px solid ${theme.inputBorder}`,
                  background: theme.inputBg,
                  color: theme.text,
                  fontFamily: 'Arial',
                  fontSize: '1rem'
                }}
              />

              {/* Images */}
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  color: '#DAA520',
                  fontFamily: 'Arial'
                }}>
                  Photos (max 5) {uploadProgress && `(${uploadProgress})`}
                </label>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '0.5rem',
                  marginBottom: '1rem'
                }}>
                  {(editingProduct ? editingProduct.images : newProduct.images).map((img, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      <img
                        src={img}
                        alt={`Article ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100px',
                          objectFit: 'cover',
                          borderRadius: '8px'
                        }}
                      />
                      <button
                        onClick={() => removeImage(idx, !!editingProduct)}
                        style={{
                          position: 'absolute',
                          top: '0.25rem',
                          right: '0.25rem',
                          background: '#e74c3c',
                          border: 'none',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#fff'
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                <label style={{
                  display: 'inline-block',
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: '2px dashed #666',
                  borderRadius: '8px',
                  color: '#DAA520',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Arial',
                  textAlign: 'center',
                  opacity: uploading ? 0.5 : 1
                }}>
                  <Camera size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  {uploading ? 'Upload en cours...' : 'Ajouter des photos'}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e, !!editingProduct)}
                    style={{ display: 'none' }}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={editingProduct ? updateProduct : addProduct}
                  disabled={uploading}
                  style={{
                    flex: 1,
                    background: uploading ? '#666' : 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                    border: 'none',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    color: uploading ? '#999' : '#000',
                    fontWeight: 600,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontFamily: 'Arial',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {uploading ? 'Veuillez patienter...' : (editingProduct ? 'Modifier' : 'Ajouter')}
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                  }}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: '1px solid #666',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    color: theme.text,
                    cursor: 'pointer',
                    fontFamily: 'Arial',
                    transition: 'all 0.3s ease'
                  }}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        background: theme.headerBg,
        borderTop: `1px solid ${theme.border}`,
        padding: '2rem',
        marginTop: '4rem',
        textAlign: 'center',
        fontFamily: 'Arial',
        transition: 'all 0.3s ease'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <a
              href={`https://instagram.com/${INSTAGRAM_HANDLE}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#E4405F',
                textDecoration: 'none',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Instagram size={24} />
              @{INSTAGRAM_HANDLE}
            </a>
          </div>
          
          <p style={{ margin: '0.5rem 0', color: theme.textMuted }}>
            © 2026 Mister X. Tous droits réservés.
          </p>
          
          <p style={{ margin: '0.5rem 0', color: theme.textMuted, fontSize: '0.9rem' }}>
            Contactez-nous sur WhatsApp: +221 71 124 88 97
          </p>
        </div>
      </footer>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(50px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import { Camera, ShoppingBag, Trash2, Edit2, LogOut, Lock, X, Plus, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Supabase Configuration - TO BE REPLACED
const supabaseUrl = 'https://gfgczrhmsrbnzisogiev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZ2N6cmhtc3Jibnppc29naWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3OTI4NjEsImV4cCI6MjA4NTM2ODg2MX0.YyU4_kXEEYonjPpfJRBWPw7KNknC7LT0ZsIYz0OOZOM';
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const WHATSAPP_NUMBER = '221757421314';
const ADMIN_PASSWORD = 'hottvintage2024'; // Change this after deployment!

const App = () => {
  const [products, setProducts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [view, setView] = useState('available');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState({});
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    size: '',
    brand: '',
    condition: '',
    images: [],
    sold: false,
    reference: ''
  });

  // Load products from Supabase in real-time
  useEffect(() => {
    loadProducts();
    
    // Subscribe to real-time changes
    const subscription = supabase
      .channel('products_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadProducts();
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
      setProducts(data || []);
    }
  };

  // Generate unique reference
  const generateReference = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `REF-${timestamp}`;
  };

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setPassword('');
    } else {
      alert('Mot de passe incorrect');
    }
  };

  // Upload images to Supabase Storage
  const uploadImages = async (files) => {
    const uploadedUrls = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      setUploadProgress(`Upload de ${i + 1}/${files.length} images...`);

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      uploadedUrls.push(data.publicUrl);
    }

    return uploadedUrls;
  };

  const handleImageUpload = async (e, isEditing = false) => {
    const files = Array.from(e.target.files);
    setUploading(true);
    setUploadProgress(`Upload de 0/${files.length} images...`);

    try {
      const imageUrls = await uploadImages(files);

      if (isEditing && editingProduct) {
        setEditingProduct({
          ...editingProduct,
          images: [...editingProduct.images, ...imageUrls]
        });
      } else {
        setNewProduct({
          ...newProduct,
          images: [...newProduct.images, ...imageUrls]
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
        images: newProduct.images,
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
      
      const { error } = await supabase
        .from('products')
        .update(updateData)
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

  const availableProducts = products.filter(p => !p.sold);
  const soldProducts = products.filter(p => p.sold);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      color: '#f5f5f5',
      fontFamily: '"Playfair Display", serif'
    }}>
      {/* Header */}
      <header style={{
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(218,165,32,0.3)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '1.5rem 2rem'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <ShoppingBag size={32} color="#DAA520" />
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '2rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '2px'
              }}>
                HOTT VINTAGE 221
              </h1>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#999', fontFamily: 'Arial' }}>
                Friperie Premium · Dakar
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {isAdmin ? (
              <>
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
                <button
                  onClick={() => setIsAdmin(false)}
                  style={{
                    background: 'transparent',
                    border: '1px solid #666',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    color: '#f5f5f5',
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

      {/* View Toggle */}
      <div style={{
        maxWidth: '1400px',
        margin: '2rem auto',
        padding: '0 2rem',
        display: 'flex',
        gap: '1rem'
      }}>
        <button
          onClick={() => setView('available')}
          style={{
            background: view === 'available' ? 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)' : 'transparent',
            border: view === 'available' ? 'none' : '1px solid #666',
            padding: '0.75rem 2rem',
            borderRadius: '8px',
            color: view === 'available' ? '#000' : '#f5f5f5',
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
            background: view === 'sold' ? 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)' : 'transparent',
            border: view === 'sold' ? 'none' : '1px solid #666',
            padding: '0.75rem 2rem',
            borderRadius: '8px',
            color: view === 'sold' ? '#000' : '#f5f5f5',
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

      {/* Products Grid */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1.5rem'
      }}>
        {(view === 'available' ? availableProducts : soldProducts).map(product => {
          const currentIndex = currentImageIndex[product.id] || 0;
          return (
            <div
              key={product.id}
              style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(218,165,32,0.2)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                cursor: 'pointer'
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
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
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
                            opacity: currentIndex === 0 ? 0.3 : 1
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
                            opacity: currentIndex === product.images.length - 1 ? 0.3 : 1
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
                    right: '0.5rem',
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
                  color: '#999',
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
                        fontSize: '0.85rem'
                      }}
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
                          fontSize: '0.85rem'
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
                          cursor: 'pointer'
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
                          cursor: 'pointer'
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
        })}
      </div>

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
          zIndex: 1000
        }}>
          <div style={{
            background: '#2d2d2d',
            padding: '2rem',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '400px',
            border: '1px solid rgba(218,165,32,0.3)'
          }}>
            <h2 style={{ marginTop: 0, color: '#DAA520' }}>Connexion Admin</h2>
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
                border: '1px solid #666',
                background: '#1a1a1a',
                color: '#f5f5f5',
                fontFamily: 'Arial',
                fontSize: '1rem'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleLogin}
                style={{
                  flex: 1,
                  background: 'linear-gradient(135deg, #DAA520 0%, #FFD700 100%)',
                  border: 'none',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  color: '#000',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Arial'
                }}
              >
                Connexion
              </button>
              <button
                onClick={() => {
                  setShowLogin(false);
                  setPassword('');
                }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid #666',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  color: '#f5f5f5',
                  cursor: 'pointer',
                  fontFamily: 'Arial'
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
          padding: '2rem'
        }}>
          <div style={{
            background: '#2d2d2d',
            padding: '2rem',
            borderRadius: '12px',
            width: '90%',
            maxWidth: '600px',
            border: '1px solid rgba(218,165,32,0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
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
                  border: '1px solid #666',
                  background: '#1a1a1a',
                  color: '#f5f5f5',
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
                  border: '1px solid #666',
                  background: '#1a1a1a',
                  color: '#f5f5f5',
                  fontFamily: 'Arial',
                  fontSize: '1rem'
                }}
              />

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
                  border: '1px solid #666',
                  background: '#1a1a1a',
                  color: '#f5f5f5',
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
                  border: '1px solid #666',
                  background: '#1a1a1a',
                  color: '#f5f5f5',
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
                  border: '1px solid #666',
                  background: '#1a1a1a',
                  color: '#f5f5f5',
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
                  Photos {uploadProgress && `(${uploadProgress})`}
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
                    fontFamily: 'Arial'
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
                    color: '#f5f5f5',
                    cursor: 'pointer',
                    fontFamily: 'Arial'
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
        background: 'rgba(0,0,0,0.5)',
        borderTop: '1px solid rgba(218,165,32,0.3)',
        padding: '2rem',
        marginTop: '4rem',
        textAlign: 'center',
        fontFamily: 'Arial'
      }}>
        <p style={{ margin: 0, color: '#999' }}>
          © 2026 Hott Vintage 221 · Friperie Premium Dakar
        </p>
        <p style={{ margin: '0.5rem 0 0 0', color: '#666', fontSize: '0.9rem' }}>
          Contactez-nous sur WhatsApp: +221 75 742 13 14
        </p>
      </footer>
    </div>
  );
};

export default App;

import React, { useState, useEffect } from 'react';
import { Camera, ShoppingBag, Trash2, Edit2, LogOut, Lock, X, Plus, Archive } from 'lucide-react';

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
  const [view, setView] = useState('available'); // 'available' or 'sold'
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    size: '',
    brand: '',
    condition: '',
    images: [],
    sold: false
  });

  // Load products from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('hott-vintage-products');
    if (saved) {
      setProducts(JSON.parse(saved));
    } else {
      // Demo products
      setProducts([
        {
          id: Date.now(),
          name: 'Veste en jean vintage',
          price: '15000',
          size: 'M',
          brand: 'Levi\'s',
          condition: 'Excellent',
          images: ['https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500'],
          sold: false
        }
      ]);
    }
  }, []);

  // Save products to localStorage
  useEffect(() => {
    localStorage.setItem('hott-vintage-products', JSON.stringify(products));
  }, [products]);

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setShowLogin(false);
      setPassword('');
    } else {
      alert('Mot de passe incorrect');
    }
  };

  const handleImageUpload = async (e, isEditing = false) => {
    const files = Array.from(e.target.files);
    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    const imageResults = await Promise.all(imagePromises);
    
    if (isEditing && editingProduct) {
      setEditingProduct({
        ...editingProduct,
        images: [...editingProduct.images, ...imageResults]
      });
    } else {
      setNewProduct({
        ...newProduct,
        images: [...newProduct.images, ...imageResults]
      });
    }
  };

  const addProduct = () => {
    if (!newProduct.name || !newProduct.price) {
      alert('Nom et prix sont obligatoires');
      return;
    }

    const product = {
      ...newProduct,
      id: Date.now(),
      sold: false
    };

    setProducts([product, ...products]);
    setNewProduct({
      name: '',
      price: '',
      size: '',
      brand: '',
      condition: '',
      images: [],
      sold: false
    });
    setShowAddModal(false);
  };

  const updateProduct = () => {
    setProducts(products.map(p => p.id === editingProduct.id ? editingProduct : p));
    setEditingProduct(null);
  };

  const deleteProduct = (id) => {
    if (window.confirm('Supprimer cet article ?')) {
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const toggleSold = (id) => {
    setProducts(products.map(p => 
      p.id === id ? { ...p, sold: !p.sold } : p
    ));
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
    const message = `Bonjour, je suis intéressé(e) par ${product.name} à ${product.price} FCFA`;
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
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
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '2rem'
      }}>
        {(view === 'available' ? availableProducts : soldProducts).map(product => (
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
            {/* Image */}
            <div style={{ position: 'relative', paddingTop: '120%', background: '#000' }}>
              {product.images.length > 0 ? (
                <img
                  src={product.images[0]}
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
                  top: '1rem',
                  right: '1rem',
                  background: '#e74c3c',
                  color: '#fff',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontFamily: 'Arial',
                  fontSize: '0.9rem'
                }}>
                  VENDU
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{
                margin: '0 0 0.5rem 0',
                fontSize: '1.3rem',
                color: '#DAA520'
              }}>
                {product.name}
              </h3>
              
              <div style={{
                fontFamily: 'Arial',
                fontSize: '0.9rem',
                color: '#999',
                marginBottom: '1rem'
              }}>
                {product.brand && <div>Marque: {product.brand}</div>}
                {product.size && <div>Taille: {product.size}</div>}
                {product.condition && <div>État: {product.condition}</div>}
              </div>

              <div style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#FFD700',
                marginBottom: '1rem',
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
                      padding: '0.75rem',
                      borderRadius: '8px',
                      color: '#fff',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'Arial'
                    }}
                  >
                    Commander
                  </button>
                )}
                
                {isAdmin && (
                  <>
                    <button
                      onClick={() => toggleSold(product.id)}
                      style={{
                        flex: 1,
                        background: product.sold ? '#27ae60' : '#e67e22',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'Arial'
                      }}
                    >
                      {product.sold ? 'Disponible' : 'Vendu'}
                    </button>
                    <button
                      onClick={() => setEditingProduct(product)}
                      style={{
                        background: '#3498db',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      style={{
                        background: '#e74c3c',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '8px',
                        color: '#fff',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
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
                  Photos
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
                  cursor: 'pointer',
                  fontFamily: 'Arial',
                  textAlign: 'center'
                }}>
                  <Camera size={20} style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  Ajouter des photos
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleImageUpload(e, !!editingProduct)}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button
                  onClick={editingProduct ? updateProduct : addProduct}
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
                  {editingProduct ? 'Modifier' : 'Ajouter'}
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

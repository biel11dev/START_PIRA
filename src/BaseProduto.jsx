import axios from "axios";
import React, { useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import * as XLSX from "xlsx";
import Message from "./Message";
import "./BaseProduto.css";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [units, setUnits] = useState(["Maço", "Fardo", "Unidade", "Pacote"]);
  const [newUnit, setNewUnit] = useState("");
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState(null);

  // Formulário de produto
  const [newProduct, setNewProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Unidade");
  const [value, setPreco] = useState("");
  const [valuecusto, setPrecoCusto] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Estados para auto-complete
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProductNames, setAllProductNames] = useState([]);

  // Formulário de categoria
  const [newCategory, setNewCategory] = useState("");
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);

  // Edição
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingProductData, setEditingProductData] = useState({});

  // Confirmação de exclusão
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });

  // Buscar produtos e categorias
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Atualizar produtos filtrados quando searchTerm ou products mudar
  useEffect(() => {
    const filtered = products.filter(
      (product) => product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  // Calcular custo automaticamente: VALOR x QUANTIDADE
  useEffect(() => {
    if (value && quantity) {
      const calculatedCost = parseFloat(value) * parseFloat(quantity);
      setPrecoCusto(calculatedCost.toFixed(2));
    }
  }, [value, quantity]);

  const fetchProducts = () => {
    axios
      .get("https://api-start-pira.vercel.app/api/products")
      .then((response) => {
        setProducts(response.data);
        setFilteredProducts(response.data);
        // Extrair nomes únicos para auto-complete
        const uniqueNames = [...new Set(response.data.map(product => product.name))];
        setAllProductNames(uniqueNames);
        console.log("Produtos carregados:", response.data);
      })
      .catch((error) => {
        console.error("Erro ao buscar produtos:", error);
        console.log("Erro ao buscar produtos:", error);
      });
  };

  const fetchCategories = () => {
    axios
      .get("https://api-start-pira.vercel.app/api/categories")
      .then((response) => setCategories(response.data))
      .catch((error) => console.error("Erro ao buscar categorias:", error));
  };

  // Função para agrupar produtos por categoria
  const groupProductsByCategory = (products) => {
    return products.reduce((groups, product) => {
      const categoryName = product.category?.name || "Sem Categoria";
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(product);
      return groups;
    }, {});
  };

  // Função para alternar expansão de grupos
  const toggleGroup = (categoryName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  // Collapse/Expand categoria (manter para compatibilidade)
  const toggleCategory = (categoryId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Filtro de produtos por nome (ajustado)
  const filterProducts = (products) =>
    products.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  // Formatar moeda
  const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // Funções de auto-complete
  const handleProductInputChange = (e) => {
    const value = e.target.value;
    setNewProduct(value);
    
    if (value.length > 0) {
      const filtered = allProductNames.filter(name =>
        name.toLowerCase().includes(value.toLowerCase())
      );
      setProductSuggestions(filtered.slice(0, 25)); // Limitar a 10 sugestões
      setShowSuggestions(true);
    } else {
      setProductSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setNewProduct(suggestion);
    setShowSuggestions(false);
    setProductSuggestions([]);
    
    // Buscar dados do produto selecionado para preencher automaticamente
    const selectedProduct = products.find(p => p.name === suggestion);
    if (selectedProduct) {
      setUnit(selectedProduct.unit);
      setPreco(selectedProduct.value);
      setPrecoCusto(selectedProduct.valuecusto);
      setCategoryId(selectedProduct.categoryId?.toString() || "");
    }
  };

  const handleProductInputBlur = () => {
    // Delay para permitir o clique na sugestão
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  // Adicionar produto
  const handleAddProduct = () => {
    if (
      newProduct.trim() !== "" &&
      quantity.trim() !== "" &&
      value.trim() !== "" &&
      valuecusto.trim() !== "" &&
      categoryId
    ) {
      setIsLoading(true);
      axios
        .post("https://api-start-pira.vercel.app/api/products", {
          name: newProduct,
          quantity,
          unit,
          value,
          valuecusto,
          categoryId: parseInt(categoryId),
        })
        .then(() => {
          setNewProduct("");
          setQuantity("");
          setUnit("Unidade");
          setPreco("");
          setPrecoCusto("");
          setCategoryId("");
          setMessage({ show: true, text: "Produto adicionado com sucesso!", type: "success" });
          fetchProducts(); // Atualizar lista de produtos
          setTimeout(() => setMessage(null), 3000);
        })
        .catch(() => {
          setMessage({ show: true, text: "Erro ao adicionar produto!", type: "error" });
          setTimeout(() => setMessage(null), 3000);
        })
        .finally(() => setIsLoading(false));
    } else {
      setMessage({ show: true, text: "Preencha todos os campos!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };



  // Unidades dinâmicas
  const handleAddUnit = () => {
    if (newUnit.trim() !== "" && !units.includes(newUnit)) {
      setUnits([...units, newUnit]);
      setNewUnit("");
      setIsUnitModalOpen(false);
    }
  };

  const handleDeleteUnit = (unitToDelete) => {
    setUnits(units.filter((u) => u !== unitToDelete));
  };

  // Funções de edição e exclusão de produtos
  const handleUpdateProduct = (product) => {
    setEditingProduct(product.id);
    setEditingProductData({
      name: product.name,
      quantity: product.quantity,
      unit: product.unit,
      value: product.value,
      valuecusto: product.valuecusto,
      categoryId: product.categoryId || "",
    });
  };

  const handleSaveProduct = () => {
    if (editingProduct) {
      const { name, quantity, unit, value, valuecusto, categoryId } = editingProductData;
      const finalCategoryId = categoryId ? parseInt(categoryId) : null;
      axios
        .put(`https://api-start-pira.vercel.app/api/estoque_prod/${editingProduct}`, { 
          name, 
          quantity, 
          unit, 
          value, 
          valuecusto, 
          categoryId: finalCategoryId 
        })
        .then((response) => {
          setProducts(products.map((product) => (product.id === editingProduct ? response.data : product)));
          setEditingProduct(null);
          setEditingProductData({});
          setMessage({ show: true, text: "Produto atualizado com sucesso!", type: "success" });
          setTimeout(() => setMessage(null), 3000);
        })
        .catch((error) => {
          setMessage({ show: true, text: "Erro ao atualizar produto!", type: "error" });
          setTimeout(() => setMessage(null), 3000);
        });
    }
  };

  const handleDeleteProduct = (productId) => {
    setConfirmDelete({ show: true, id: productId });
  };

  const confirmDeleteProduct = () => {
    const { id } = confirmDelete;
    axios
      .delete(`https://api-start-pira.vercel.app/api/estoque_prod/${id}`)
      .then(() => {
        setProducts(products.filter((p) => p.id !== id));
        setConfirmDelete({ show: false, id: null });
        setMessage({ show: true, text: "Produto excluído com sucesso!", type: "success" });
        setTimeout(() => setMessage(null), 3000);
      })
      .catch((error) => {
        setMessage({ show: true, text: "Erro ao excluir produto!", type: "error" });
        setTimeout(() => setMessage(null), 3000);
      });
  };

  const cancelDeleteProduct = () => {
    setConfirmDelete({ show: false, id: null });
  };

  // Exportar para Excel
  const handleExportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      products.map((product) => ({
        ID: product.id,
        Produto: product.name,
        Quantidade: product.quantity,
        Unidade: product.unit,
        Categoria: product.category?.name || "Sem categoria",
        Valor: formatCurrency(product.value),
        Custo: formatCurrency(product.valuecusto),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estoque");
    XLSX.writeFile(workbook, "estoque-produtos.xlsx");
  };

  return (
    <div className="bp-container">
      <h2 className="bp-title">Estoque</h2>
      
      {/* Filtro */}
      <div className="bp-search">
        <input
          type="text"
          placeholder="Pesquisar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Modal para adicionar nova unidade */}
      {isUnitModalOpen && (
        <div className="bp-modal">
          <div className="bp-modal-content">
            <h3 className="bp-modal-title">Adicionar Nova Unidade</h3>
            <input 
              className="bp-modal-input" 
              type="text" 
              value={newUnit} 
              onChange={(e) => setNewUnit(e.target.value)} 
              placeholder="Digite a nova unidade" 
            />
            <div className="bp-modal-buttons">
              <button onClick={handleAddUnit}>Confirmar</button>
              <button onClick={() => setIsUnitModalOpen(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}


      {/* Formulário de cadastro de produto */}
      <div
        className="input-group-est"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleAddProduct();
          }
        }}
      >
        {/* Campo de auto-complete para nome do produto */}
        <div className="bp-autocomplete">
          <input
            className="bp-autocomplete-input"
            type="text"
            value={newProduct}
            onChange={handleProductInputChange}
            onBlur={handleProductInputBlur}
            onFocus={() => {
              if (newProduct.length > 0 && productSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder="Nome do Produto"
            disabled={isLoading}
          />
          {showSuggestions && productSuggestions.length > 0 && (
            <ul className="bp-suggestions">
              {productSuggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        <input
          className="bp-input-quantidade"
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Quantidade"
          disabled={isLoading}
        />
        <input
          className="bp-input-valor"
          type="number"
          value={value}
          onChange={(e) => setPreco(e.target.value)}
          placeholder="Valor (R$)"
          disabled={isLoading}
        />
        <input
          className="bp-input-valor"
          type="number"
          value={valuecusto}
          onChange={(e) => setPrecoCusto(e.target.value)}
          placeholder="Custo (R$)"
          disabled={isLoading}
          title="Calculado automaticamente (Valor x Quantidade), mas pode ser editado"
        />
  
        {/* Campo de seleção de unidades com exclusão */}
        <div className="bp-select">
          <div className="bp-selected-unit">{unit || "Selecione uma unidade"}</div>
          <ul className="bp-unit-dropdown">
            {units.map((u, index) => (
              <li key={index} className="bp-unit-item">
                <span className="bp-unit-name" onClick={() => setUnit(u)}>
                  {u}
                </span>
                <button
                  className="bp-delete-unit"
                  onClick={() => handleDeleteUnit(u)}
                  title="Excluir unidade"
                  disabled={isLoading}
                >
                  🗑️
                </button>
              </li>
            ))}
            <li className="bp-add-unit" onClick={() => setIsUnitModalOpen(true)}>
              + Adicionar nova unidade
            </li>
          </ul>
        </div>
        <button className="bp-btn-add" onClick={handleAddProduct} disabled={isLoading}>
          {isLoading ? <FaSpinner className="bp-loading" /> : "Adicionar Produto"}
        </button>
      </div>

      {/* Lista de produtos agrupados por categoria */}
      <div className="bp-header">
        <div className="bp-header-container">
          <div className="bp-header-col">NOME DO PRODUTO</div>
          <div className="bp-header-col">QTD</div>
          <div className="bp-header-col">UNIDADE</div>
          <div className="bp-header-col">CATEGORIA</div>
          <div className="bp-header-col">VALOR UN</div>
          <div className="bp-header-col">CUSTO</div>
        </div>
        <div className="bp-header-actions">AÇÕES</div>
      </div>

      <ul className="bp-list">
        {Object.entries(groupProductsByCategory(filteredProducts)).map(([categoryName, categoryProducts]) => (
          <li key={categoryName} className="bp-group">
            <div className="bp-group-header" onClick={() => toggleGroup(categoryName)}>
              <div className="bp-group-title">
                <span>{categoryName}</span>
              </div>
              <div className="bp-group-info">
                <span className="bp-group-count">{categoryProducts.length}</span>
                <button 
                  className="bp-expand-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(categoryName);
                  }}
                >
                  {expandedGroups[categoryName] ? "Ocultar" : "Expandir"}
                </button>
              </div>
            </div>
            {expandedGroups[categoryName] && (
              <ul className="bp-details">
                {categoryProducts.map((product) => (
                  <li className="bp-item" key={product.id}>
                {editingProduct === product.id ? (
                  <div className="bp-edit-form">
                    <div className="bp-edit-field">
                      <label className="bp-edit-label">Nome</label>
                      <input 
                        className="bp-edit-input"
                        type="text" 
                        value={editingProductData.name} 
                        onChange={(e) => setEditingProductData({ ...editingProductData, name: e.target.value })} 
                      />
                    </div>
                    <div className="bp-edit-field">
                      <label className="bp-edit-label">Quantidade</label>
                      <input 
                        className="bp-edit-input"
                        type="number" 
                        value={editingProductData.quantity} 
                        onChange={(e) => setEditingProductData({ ...editingProductData, quantity: e.target.value })} 
                      />
                    </div>
                    <div className="bp-edit-field">
                      <label className="bp-edit-label">Unidade</label>
                      <select 
                        className="bp-edit-input" 
                        value={editingProductData.unit} 
                        onChange={(e) => setEditingProductData({ ...editingProductData, unit: e.target.value })}
                      >
                        {units.map((u, index) => (
                          <option key={index} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bp-edit-field">
                      <label className="bp-edit-label">Categoria</label>
                      <select 
                        className="bp-edit-input" 
                        value={editingProductData.categoryId || ""} 
                        onChange={(e) => setEditingProductData({ ...editingProductData, categoryId: e.target.value })}
                      >
                        <option value="">Sem categoria</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="bp-edit-field">
                      <label className="bp-edit-label">Valor</label>
                      <input 
                        className="bp-edit-input"
                        type="number" 
                        value={editingProductData.value} 
                        onChange={(e) => setEditingProductData({ ...editingProductData, value: e.target.value })} 
                      />
                    </div>
                    <div className="bp-edit-field">
                      <label className="bp-edit-label">Custo</label>
                      <input 
                        className="bp-edit-input"
                        type="number" 
                        value={editingProductData.valuecusto} 
                        onChange={(e) => setEditingProductData({ ...editingProductData, valuecusto: e.target.value })} 
                      />
                    </div>
                    <div className="bp-edit-buttons">
                      <button className="bp-btn-save" onClick={handleSaveProduct}>
                        Salvar
                      </button>
                      <button className="bp-btn-cancel" onClick={() => setEditingProduct(null)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bp-info-container">
                      <div className="bp-info-row">
                        <span className="bp-info-value">{product.name}</span>
                      </div>
                      <div className="bp-info-row">
                        <span className="bp-info-value">{product.quantity}</span>
                      </div>
                      <div className="bp-info-row">
                        <span className="bp-info-value">{product.unit}</span>
                      </div>
                      <div className="bp-info-row">
                        <span className="bp-info-value">{product.category?.name || "Sem categoria"}</span>
                      </div>
                      <div className="bp-info-row">
                        <span className="bp-value-destaquee">{formatCurrency(product.value)}</span>
                      </div>
                      <div className="bp-info-row">
                        <span className="bp-value-destaque">{formatCurrency(product.valuecusto)}</span>
                      </div>
                    </div>
                    <div className="bp-actions">
                      <button className="bp-btn-update" onClick={() => handleUpdateProduct(product)}>
                        Editar
                      </button>
                      <button className="bp-btn-delete" onClick={() => handleDeleteProduct(product.id)}>
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
            )}
          </li>
        ))}
      </ul>

      <button onClick={handleExportToExcel} className="bp-btn-export">
        Exportar para Excel
      </button>

      {confirmDelete.show && (
        <Message 
          message="Tem certeza que deseja excluir este produto?" 
          type="warning" 
          onClose={cancelDeleteProduct} 
          onConfirm={confirmDeleteProduct} 
        />
      )}

      {message && (
        <Message
          message={message.text}
          type={message.type}
          onClose={() => setMessage(null)}
        />
      )}
    </div>
  );
};

export default ProductList;
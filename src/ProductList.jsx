import axios from "axios";
import React, { useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import * as XLSX from "xlsx";
import Message from "./Message";
import "./ProductList.css";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Unidade");
  const [value, setPreco] = useState("");
  const [valuecusto, setPrecoCusto] = useState("");
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingProductData, setEditingProductData] = useState({});
  const [newUnit, setNewUnit] = useState("");
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // Estados para categorias e subcategorias
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [parentId, setParentId] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCategoryModalAdd, setIsCategoryModalAdd] = useState(false);
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState({ show: false, id: null });
  const [categoryFilter, setCategoryFilter] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  
  // Estados para equivalência de unidades
  const [isUnitEquivalenceModalOpen, setIsUnitEquivalenceModalOpen] = useState(false);
  const [selectedUnitForEquivalence, setSelectedUnitForEquivalence] = useState("");
  const [unitEquivalence, setUnitEquivalence] = useState("");
  const [unitEquivalences, setUnitEquivalences] = useState({});

  // Estados para ordenação
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" ou "desc"

  // Estados para auto-complete
  const [productSuggestions, setProductSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProductNames, setAllProductNames] = useState([]);

  useEffect(() => {
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
      });
  }, []);

  useEffect(() => {
    axios
      .get("https://api-start-pira.vercel.app/api/unit-equivalences")
      .then((response) => {
        const equivalencesObj = response.data.reduce((acc, equiv) => {
          acc[equiv.unitName] = equiv.value;
          return acc;
        }, {});
        equivalencesObj["Unidade"] = 1;
        setUnitEquivalences(equivalencesObj);
        console.log("Equivalências carregadas:", equivalencesObj);
      })
      .catch((error) => {
        console.error("Erro ao buscar equivalências:", error);
        setUnitEquivalences({
          "Unidade": 1,
          "Maço": 20,
          "Fardo": 10,
          "Pacote": 12
        });
      });
  }, []);

  useEffect(() => {
    axios
      .get("https://api-start-pira.vercel.app/api/categories")
      .then((response) => {
        setCategories(response.data);
        console.log("Categorias carregadas:", response.data);
      })
      .catch((error) => {
        console.error("Erro ao buscar categorias:", error);
      });
  }, []);

  useEffect(() => {
    let filtered = products.filter(
      (product) => product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Aplicar ordenação
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue, bValue;

        switch (sortField) {
          case "name":
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case "quantity":
            aValue = parseFloat(a.quantity) || 0;
            bValue = parseFloat(b.quantity) || 0;
            break;
          case "value":
            aValue = parseFloat(a.value) || 0;
            bValue = parseFloat(b.value) || 0;
            break;
          case "valuecusto":
            aValue = parseFloat(a.valuecusto) || 0;
            bValue = parseFloat(b.valuecusto) || 0;
            break;
          default:
            return 0;
        }

        if (sortOrder === "asc") {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        } else {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        }
      });
    }

    setFilteredProducts(filtered);
  }, [searchTerm, products, sortField, sortOrder]);

  // Calcular custo automaticamente: VALOR x QUANTIDADE
  useEffect(() => {
    if (value && quantity) {
      const valorNumerico = parseCurrencyInput(value);
      const calculatedCost = valorNumerico * parseFloat(quantity);
      const formatted = formatCurrencyInput((calculatedCost * 100).toFixed(0));
      setPrecoCusto(formatted);
    }
  }, [value, quantity]);

  useEffect(() => {
    if (!isCategoryModalOpen) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest(".custom-select") && !e.target.closest(".modal")) {
        setIsCategoryModalOpen(false);
        setCategoryFilter("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCategoryModalOpen]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const formatCurrencyInput = (value) => {
    const numbers = value.replace(/\D/g, "");
    const amount = Number(numbers) / 100;
    return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const parseCurrencyInput = (value) => {
    const numbers = value.replace(/\./g, "").replace(",", ".");
    return parseFloat(numbers) || 0;
  };

  const handleAddProduct = () => {
    if (newProduct.trim() !== "" && quantity.trim() !== "" && value.trim() !== "" && valuecusto.trim() !== "") {
      setIsLoading(true);
      const categoryId = selectedCategory ? parseInt(selectedCategory) : null;
      let valorNumerico = parseCurrencyInput(value);
      const custoNumerico = parseCurrencyInput(valuecusto);
      
      // Se o valor estiver zerado, usar o custo como valor
      if (valorNumerico === 0) {
        valorNumerico = custoNumerico;
      }
      
      axios
        .post("https://api-start-pira.vercel.app/api/products", { 
          name: newProduct, 
          quantity, 
          unit, 
          value: valorNumerico, 
          valuecusto: custoNumerico, 
          categoryId 
        })
        .then((response) => {
          setProducts([...products, response.data]);
          setNewProduct("");
          setQuantity("");
          setUnit("Unidade");
          setPreco("");
          setPrecoCusto("");
          setSelectedCategory("");
          setMessage({ show: true, text: "Produto adicionado com sucesso!", type: "success" });
          setTimeout(() => setMessage(null), 3000);
        })
        .catch((error) => {
          setMessage({ show: true, text: "Erro ao adicionar produto!", type: "error" });
          setTimeout(() => setMessage(null), 3000);
        })
        .finally(() => setIsLoading(false));
    } else {
      setMessage({ show: true, text: "Preencha todos os campos!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleAddUnit = () => {
    if (newUnit.trim() !== "" && !Object.keys(unitEquivalences).includes(newUnit)) {
      if (newUnit !== "Unidade") {
        setSelectedUnitForEquivalence(newUnit);
        setIsUnitModalOpen(false);
        setNewUnit("");
        setIsUnitEquivalenceModalOpen(true);
      } else {
        setUnitEquivalences({
          ...unitEquivalences,
          [newUnit]: 1
        });
        setIsUnitModalOpen(false);
        setNewUnit("");
        setMessage({ show: true, text: `Unidade "${newUnit}" adicionada com sucesso!`, type: "success" });
        setTimeout(() => setMessage(null), 3000);
      }
    } else if (Object.keys(unitEquivalences).includes(newUnit)) {
      setMessage({ show: true, text: "Esta unidade já existe!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ show: true, text: "Digite o nome da unidade!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSaveUnitEquivalence = () => {
    if (unitEquivalence.trim() !== "" && !isNaN(unitEquivalence) && parseFloat(unitEquivalence) > 0) {
      const isEditing = unitEquivalences[selectedUnitForEquivalence];
      const equivalenceValue = parseFloat(unitEquivalence);
      
      const apiCall = isEditing 
        ? axios.put(`https://api-start-pira.vercel.app/api/unit-equivalences/${selectedUnitForEquivalence}`, {
            value: equivalenceValue
          })
        : axios.post("https://api-start-pira.vercel.app/api/unit-equivalences", {
            unitName: selectedUnitForEquivalence,
            value: equivalenceValue
          });

      apiCall
        .then(() => {
          setUnitEquivalences({
            ...unitEquivalences,
            [selectedUnitForEquivalence]: equivalenceValue
          });
          
          if (!isEditing) {
            setUnit(selectedUnitForEquivalence);
          }
          
          setIsUnitEquivalenceModalOpen(false);
          setSelectedUnitForEquivalence("");
          setUnitEquivalence("");
          setMessage({ 
            show: true, 
            text: `Equivalência ${isEditing ? 'atualizada' : 'definida'}: 1 ${selectedUnitForEquivalence} = ${equivalenceValue} Unidades`, 
            type: "success" 
          });
          setTimeout(() => setMessage(null), 3000);
        })
        .catch((error) => {
          console.error("Erro ao salvar equivalência:", error);
          if (error.response?.status === 409) {
            setMessage({ show: true, text: "Esta unidade já possui equivalência definida!", type: "error" });
          } else {
            setMessage({ show: true, text: "Erro ao salvar equivalência!", type: "error" });
          }
          setTimeout(() => setMessage(null), 3000);
        });
    } else {
      setMessage({ show: true, text: "Digite um número válido maior que zero!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteUnit = (unitToDelete) => {
    if (unitEquivalences[unitToDelete]) {
      axios
        .delete(`https://api-start-pira.vercel.app/api/unit-equivalences/${unitToDelete}`)
        .then(() => {
          const newEquivalences = { ...unitEquivalences };
          delete newEquivalences[unitToDelete];
          setUnitEquivalences(newEquivalences);
          setMessage({ show: true, text: `Unidade "${unitToDelete}" excluída com sucesso!`, type: "success" });
          setTimeout(() => setMessage(null), 3000);
        })
        .catch((error) => {
          console.error("Erro ao excluir equivalência:", error);
          setMessage({ show: true, text: "Erro ao excluir equivalência da unidade!", type: "error" });
          setTimeout(() => setMessage(null), 3000);
        });
    } else {
      setMessage({ show: true, text: `Unidade "${unitToDelete}" excluída com sucesso!`, type: "success" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleUnitSelection = (selectedUnit) => {
    if (selectedUnit !== "Unidade" && !unitEquivalences[selectedUnit]) {
      setSelectedUnitForEquivalence(selectedUnit);
      setIsUnitEquivalenceModalOpen(true);
    } else {
      setUnit(selectedUnit);
    }
  };

  const handleEditUnitEquivalence = (unitName) => {
    setSelectedUnitForEquivalence(unitName);
    setUnitEquivalence(unitEquivalences[unitName].toString());
    setIsUnitEquivalenceModalOpen(true);
  };

  // Funções de auto-complete
  const handleProductInputChange = (e) => {
    const value = e.target.value;
    setNewProduct(value);
    
    if (value.length > 0) {
      const filtered = allProductNames.filter(name =>
        name.toLowerCase().includes(value.toLowerCase())
      );
      setProductSuggestions(filtered.slice(0, 25));
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
      setQuantity(selectedProduct.quantity.toString());
      setUnit(selectedProduct.unit);
      
      // Se o valor estiver zerado, usar o custo como valor
      const valorParaUsar = selectedProduct.value === 0 ? selectedProduct.valuecusto : selectedProduct.value;
      const valorFormatado = formatCurrencyInput((valorParaUsar * 100).toFixed(0));
      const custoFormatado = formatCurrencyInput((selectedProduct.valuecusto * 100).toFixed(0));
      
      setPreco(valorFormatado);
      setPrecoCusto(custoFormatado);
      setSelectedCategory(selectedProduct.categoryId?.toString() || "");
    }
  };

  const handleProductInputBlur = () => {
    // Delay para permitir o clique na sugestão
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleAddCategory = () => {
    if (newCategory.trim() !== "" && !getAllCategories().some((cat) => cat.name === newCategory)) {
      setIsLoading(true);
      axios
        .post("https://api-start-pira.vercel.app/api/categories", { 
          name: newCategory, 
          parentId: parentId || null 
        })
        .then(() => {
          return axios.get("https://api-start-pira.vercel.app/api/categories");
        })
        .then((response) => {
          setCategories(response.data);
          setNewCategory("");
          setParentId("");
          setIsCategoryModalAdd(false);
          setMessage({ show: true, text: "Categoria adicionada com sucesso!", type: "success" });
          setTimeout(() => setMessage(null), 3000);
        })
        .catch((error) => {
          setMessage({ show: true, text: "Erro ao adicionar categoria!", type: "error" });
          setTimeout(() => setMessage(null), 3000);
        })
        .finally(() => setIsLoading(false));
    }
  };

  const handleDeleteCategory = (id) => {
    axios
      .delete(`https://api-start-pira.vercel.app/api/categories/${id}`)
      .then(() => {
        return axios.get("https://api-start-pira.vercel.app/api/categories");
      })
      .then((response) => {
        setCategories(response.data);
        setConfirmDeleteCategory({ show: false, id: null });
        setMessage({ show: true, text: "Categoria excluída com sucesso!", type: "success" });
        setTimeout(() => setMessage(null), 3000);
      })
      .catch((error) => {
        const errorMessage = error.response?.data?.error || "Erro ao excluir categoria!";
        setMessage({ show: true, text: errorMessage, type: "error" });
        setTimeout(() => setMessage(null), 3000);
      });
  };

  const getAllCategories = () => {
    const allCategories = [];
    categories.forEach(category => {
      allCategories.push(category);
      if (category.subcategories) {
        allCategories.push(...category.subcategories);
      }
    });
    return allCategories;
  };

  const groupProductsByCategory = (products) => {
    const hierarchy = {};
    
    products.forEach(product => {
      let parentName = "Sem Categoria";
      let subcategoryName = null;
      
      if (product.category) {
        if (product.category.parent) {
          // Produto tem subcategoria
          parentName = product.category.parent.name;
          subcategoryName = product.category.name;
        } else {
          // Produto tem apenas categoria pai
          parentName = product.category.name;
        }
      }
      
      // Criar categoria pai se não existir
      if (!hierarchy[parentName]) {
        hierarchy[parentName] = {
          totalCount: 0,
          subcategories: {}
        };
      }
      
      if (subcategoryName) {
        // Adicionar à subcategoria
        if (!hierarchy[parentName].subcategories[subcategoryName]) {
          hierarchy[parentName].subcategories[subcategoryName] = [];
        }
        hierarchy[parentName].subcategories[subcategoryName].push(product);
      } else {
        // Adicionar direto à categoria pai (sem subcategoria)
        if (!hierarchy[parentName].subcategories['_direct']) {
          hierarchy[parentName].subcategories['_direct'] = [];
        }
        hierarchy[parentName].subcategories['_direct'].push(product);
      }
      
      hierarchy[parentName].totalCount++;
    });
    
    return hierarchy;
  };

  const toggleGroup = (categoryName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const handleEditProduct = (product) => {
    setIsCategoryModalOpen(false);
    setCategoryFilter("");
    
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

  const handleUpdateProduct = (id) => {
    setIsLoadingSave(true);
    const { name, quantity, unit, value, valuecusto, categoryId } = editingProductData;
    const finalCategoryId = categoryId ? parseInt(categoryId) : null;
    
    axios
      .put(`https://api-start-pira.vercel.app/api/products/${id}`, { 
        name, 
        quantity, 
        unit, 
        value, 
        valuecusto, 
        categoryId: finalCategoryId 
      })
      .then((response) => {
        const updatedProducts = products.map((product) => (product.id === id ? response.data : product));
        setProducts(updatedProducts);
        setMessage({ show: true, text: "Produto atualizado com sucesso!", type: "success" });
        setEditingProduct(null);
        setEditingProductData({});
        setTimeout(() => setMessage(null), 3000);
      })
      .catch((error) => {
        console.error("Erro ao atualizar produto:", error);
        let errorMessage = "Erro ao atualizar produto!";
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        }
        setMessage({ show: true, text: errorMessage, type: "error" });
        setTimeout(() => setMessage(null), 5000);
      })
      .finally(() => {
        setIsLoadingSave(false);
      });
  };

  const handleDeleteProduct = (productId) => {
    setIsCategoryModalOpen(false);
    setCategoryFilter("");
    setConfirmDelete({ show: true, id: productId });
  };

  const confirmDeleteProduct = () => {
    const { id } = confirmDelete;
    axios
      .delete(`https://api-start-pira.vercel.app/api/products/${id}`)
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

  const handleExportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      products.map((product) => ({
        ID: product.id,
        Produto: product.name,
        Quantidade: product.quantity,
        Unidade: product.unit,
        Categoria: product.category?.parent 
          ? `${product.category.parent.name} > ${product.category.name}`
          : product.category?.name || "Sem categoria",
        Valor: formatCurrency(product.value),
        Custo: formatCurrency(product.valuecusto),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");
    XLSX.writeFile(workbook, "produtos.xlsx");
  };

  return (
    <div className="product-list-container">
      <h2 className="fixed-title">Lista de Compras</h2>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Pesquisar produtos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Modais */}
      {isUnitModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3 className="texto-add-unidade">Adicionar Nova Unidade</h3>
            <input 
              className="texto-unidade" 
              type="text" 
              value={newUnit} 
              onChange={(e) => setNewUnit(e.target.value)} 
              placeholder="Digite a nova unidade" 
            />
            <div className="modal-buttons">
              <button onClick={handleAddUnit}>Confirmar</button>
              <button onClick={() => {
                setIsUnitModalOpen(false);
                setNewUnit("");
              }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isCategoryModalAdd && (
        <div className="modal">
          <div className="modal-content">
            <h3 className="texto-add-unidade">Adicionar Nova Categoria</h3>
            <input 
              className="texto-unidade" 
              type="text" 
              value={newCategory} 
              onChange={(e) => setNewCategory(e.target.value)} 
              placeholder="Digite a nova categoria" 
            />
            <select 
              className="texto-unidade" 
              value={parentId} 
              onChange={(e) => setParentId(e.target.value)}
              style={{ marginTop: "10px" }}
            >
              <option value="">Categoria principal</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <div className="modal-buttons">
              <button onClick={handleAddCategory}>Confirmar</button>
              <button onClick={() => {
                setIsCategoryModalAdd(false);
                setNewCategory("");
                setParentId("");
              }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {isUnitEquivalenceModalOpen && (
        <div className="modal">
          <div className="modal-content">
            <h3 className="texto-add-unidade">
              {unitEquivalences[selectedUnitForEquivalence] ? 'Editar Equivalência' : 'Definir Equivalência'}
            </h3>
            <p style={{ color: '#333', fontSize: '14px', marginBottom: '15px', textShadow: 'none' }}>
              Quantas unidades representa 1 {selectedUnitForEquivalence}?
            </p>
            <input 
              className="texto-unidade" 
              type="number" 
              value={unitEquivalence} 
              onChange={(e) => setUnitEquivalence(e.target.value)} 
              placeholder="Ex: 12" 
              min="1"
              step="0.1"
            />
            <p style={{ color: '#666', fontSize: '12px', marginTop: '10px', textShadow: 'none' }}>
              Exemplo: 1 {selectedUnitForEquivalence} = {unitEquivalence || '?'} Unidades
            </p>
            <div className="modal-buttons">
              <button onClick={handleSaveUnitEquivalence}>
                {unitEquivalences[selectedUnitForEquivalence] ? 'Atualizar' : 'Confirmar'}
              </button>
              <button onClick={() => {
                setIsUnitEquivalenceModalOpen(false);
                setSelectedUnitForEquivalence("");
                setUnitEquivalence("");
              }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Formulário de entrada */}
      <div className="input-group" onKeyDown={(e) => { if (e.key === "Enter") handleAddProduct(); }}>
        {/* Campo de auto-complete para nome do produto */}
        <div className="autocomplete-wrapper">
          <input 
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
            <ul className="suggestions-list">
              {productSuggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="suggestion-item"
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        <input 
          type="number" 
          value={quantity} 
          onChange={(e) => setQuantity(e.target.value)} 
          placeholder="Quantidade" 
          disabled={isLoading} 
        />
        <div className="currency-input-wrapper">
          <span className="currency-prefix">R$</span>
          <input 
            type="text" 
            value={value} 
            onChange={(e) => {
              const formatted = formatCurrencyInput(e.target.value);
              setPreco(formatted);
            }}
            placeholder="0,00" 
            disabled={isLoading}
          />
        </div>
        <div className="currency-input-wrapper">
          <span className="currency-prefix">R$</span>
          <input 
            className="input-custo-calculado"
            type="text" 
            value={valuecusto} 
            onChange={(e) => {
              const formatted = formatCurrencyInput(e.target.value);
              setPrecoCusto(formatted);
            }}
            placeholder="0,00" 
            disabled={isLoading}
            title="Calculado automaticamente (Valor x Quantidade), mas pode ser editado"
          />
        </div>
        
        {/* Seletor de unidades */}
        <div className="custom-select">
          <div className="selected-unit">
            {unit || "Selecione uma unidade"}
            {unit && unit !== "Unidade" && unitEquivalences[unit] && (
              <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px', textShadow: 'none' }}>
                (1 = {unitEquivalences[unit]} un.)
              </span>
            )}
          </div>
          <ul className="unit-dropdown">
            <li className="unit-item">
              <span className="unit-name" onClick={() => setUnit("Unidade")}>
                Unidade
              </span>
            </li>
            {Object.keys(unitEquivalences).filter(u => u !== "Unidade").map((u, index) => (
              <li key={index} className="unit-item">
                <span className="unit-name" onClick={() => handleUnitSelection(u)}>
                  {u}
                  {unitEquivalences[u] && (
                    <span style={{ fontSize: '10px', color: '#888', marginLeft: '5px', textShadow: 'none' }}>
                      (1 = {unitEquivalences[u]} un.)
                    </span>
                  )}
                </span>
                <div className="unit-buttons">
                  {unitEquivalences[u] && (
                    <button 
                      className="edit-unit-button" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditUnitEquivalence(u);
                      }}
                      title="Editar equivalência" 
                      disabled={isLoading}
                    >
                      ✏️
                    </button>
                  )}
                  <button 
                    className="delete-unit-button" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUnit(u);
                    }}
                    title="Excluir unidade" 
                    disabled={isLoading}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            ))}
            <li className="add-unit-option" onClick={() => setIsUnitModalOpen(true)}>
              + Adicionar nova unidade
            </li>
          </ul>
        </div>
        
        {/* Seletor de categorias */}
        <div className="custom-select custom-select-category">
          <div className="selected-unitttt" onClick={() => setIsCategoryModalOpen((prev) => !prev)} tabIndex={0}>
            <span className="category-name-selected">
              {selectedCategory ? (
                (() => {
                  const allCategories = getAllCategories();
                  const category = allCategories.find(cat => cat.id === parseInt(selectedCategory));
                  if (category?.parent) {
                    return `${category.parent.name} > ${category.name}`;
                  }
                  return category?.name || "Categoria não encontrada";
                })()
              ) : (
                "Selecione a categoria"
              )}
            </span>
          </div>
          {isCategoryModalOpen && (
            <ul className="unit-dropdown">
              <li>
                <input
                  type="text"
                  className="expense-filter-input"
                  placeholder="Filtrar categorias..."
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  autoFocus
                />
              </li>
              {categories
                .filter((category) => category.name.toLowerCase().includes(categoryFilter.toLowerCase()))
                .map((category) => (
                  <React.Fragment key={category.id}>
                    <li className="unit-item">
                      <span
                        className="unit-name"
                        onClick={() => {
                          setSelectedCategory(category.id.toString());
                          setIsCategoryModalOpen(false);
                          setCategoryFilter("");
                        }}
                        style={{ fontWeight: 'bold' }}
                      >
                        📁 {category.name}
                      </span>
                      <button 
                        className="delete-unit-button" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteCategory({ show: true, id: category.id });
                        }}
                        title="Excluir categoria" 
                        disabled={isLoading}
                      >
                        🗑️
                      </button>
                    </li>
                    {category.subcategories && category.subcategories
                      .filter((subcategory) => subcategory.name.toLowerCase().includes(categoryFilter.toLowerCase()))
                      .map((subcategory) => (
                        <li key={subcategory.id} className="unit-item" style={{ paddingLeft: '20px' }}>
                          <span
                            className="unit-name"
                            onClick={() => {
                              setSelectedCategory(subcategory.id.toString());
                              setIsCategoryModalOpen(false);
                              setCategoryFilter("");
                            }}
                          >
                            📄 {subcategory.name}
                          </span>
                          <button 
                            className="delete-unit-button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteCategory({ show: true, id: subcategory.id });
                            }}
                            title="Excluir subcategoria" 
                            disabled={isLoading}
                          >
                            🗑️
                          </button>
                        </li>
                      ))}
                  </React.Fragment>
                ))}
              <li className="add-unit-option" onClick={() => setIsCategoryModalAdd(true)}>
                + Adicionar nova categoria
              </li>
            </ul>
          )}
        </div>
        
        <button onClick={handleAddProduct} disabled={isLoading}>
          {isLoading ? <FaSpinner className="loading-iconn" /> : "Adicionar Produto"}
        </button>
      </div>

      {/* Filtros de ordenação */}
      <div className={`sort-filters ${isCategoryModalOpen ? 'modal-open' : ''}`}>
        <label>Ordenar por:</label>
        <select 
          value={sortField} 
          onChange={(e) => {
            setSortField(e.target.value);
            if (!e.target.value) setSortOrder("asc");
          }}
        >
          <option value="">Nenhum</option>
          <option value="name">Nome (A-Z)</option>
          <option value="quantity">Quantidade</option>
          <option value="value">Valor</option>
          <option value="valuecusto">Custo</option>
        </select>
        {sortField && (
          <button 
            className="sort-order-btn"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            title={sortOrder === "asc" ? "Crescente" : "Decrescente"}
          >
            {sortOrder === "asc" ? "↑ Crescente" : "↓ Decrescente"}
          </button>
        )}
      </div>

      {/* Lista de produtos */}
      <div className="product-list">
        {/* Cabeçalho da lista */}
        <div className="product-list-header">
          <span className="header-name">Nome do Produto</span>
          <span className="header-quantity">Qtd</span>
          <span className="header-unit">Unidade</span>
          <span className="header-category">Categoria</span>
          <span className="header-value">Valor</span>
          <span className="header-value">Custo</span>
          <span className="header-actions">Ações</span>
        </div>

        {/* Lista agrupada por categoria hierárquica */}
        <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
          {Object.entries(groupProductsByCategory(filteredProducts)).map(([parentName, parentData]) => (
            <li key={parentName} className="product-group">
              {/* Cabeçalho da categoria PAI */}
              <div className="group-header parent-category-header" onClick={() => toggleGroup(parentName)}>
                <span> {parentName}</span>
                <span>{parentData.totalCount} produtos</span>
                <button 
                  className="botao-expend"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(parentName);
                  }}
                >
                  {expandedGroups[parentName] ? "Ocultar" : "Expandir"}
                </button>
              </div>
              
              {/* Se expandido, mostra as SUBCATEGORIAS */}
              {expandedGroups[parentName] && (
                <ul style={{ listStyleType: 'none', paddingLeft: '20px' }}>
                  {Object.entries(parentData.subcategories).map(([subName, subProducts]) => (
                    <li key={`${parentName}-${subName}`} className="subcategory-group">
                      {/* Cabeçalho da SUBCATEGORIA */}
                      <div 
                        className="group-header subcategory-header" 
                        onClick={() => toggleGroup(`${parentName}-${subName}`)}
                      >
                        <span>
                          {subName === '_direct' ? ' Produtos diretos' : ` ${subName}`}
                        </span>
                        <span>{subProducts.length} produtos</span>
                        <button 
                          className="botao-expend"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGroup(`${parentName}-${subName}`);
                          }}
                        >
                          {expandedGroups[`${parentName}-${subName}`] ? "Ocultar" : "Expandir"}
                        </button>
                      </div>
                      
                      {/* Se expandido, mostra os PRODUTOS */}
                      {expandedGroups[`${parentName}-${subName}`] && (
                        <ul className="group-details">
                          {subProducts.map((product) => (
                    <li key={product.id} className="lista-produtos">
                      {editingProduct === product.id ? (
                        // Formulário de edição
                        <div className="product-edit-form">
                          <div className="product-edit-field">
                            <label className="product-edit-label">Nome</label>
                            <input
                              type="text"
                              value={editingProductData.name}
                              onChange={(e) => setEditingProductData({ ...editingProductData, name: e.target.value })}
                              placeholder="Nome do produto"
                              className="product-edit-input"
                            />
                          </div>
                          <div className="product-edit-field">
                            <label className="product-edit-label">Quantidade</label>
                            <input
                              type="number"
                              value={editingProductData.quantity}
                              onChange={(e) => setEditingProductData({ ...editingProductData, quantity: e.target.value })}
                              placeholder="Quantidade"
                              className="product-edit-input"
                            />
                          </div>
                          <div className="product-edit-field">
                            <label className="product-edit-label">Unidade</label>
                            <select 
                              value={editingProductData.unit} 
                              onChange={(e) => setEditingProductData({ ...editingProductData, unit: e.target.value })}
                              className="product-edit-input"
                            >
                              {Object.keys(unitEquivalences).map((u, index) => (
                                <option key={index} value={u}>{u}</option>
                              ))}
                            </select>
                          </div>
                          <div className="product-edit-field">
                            <label className="product-edit-label">Categoria</label>
                            <select 
                              value={editingProductData.categoryId || ""} 
                              onChange={(e) => setEditingProductData({ ...editingProductData, categoryId: e.target.value })}
                              className="product-edit-input"
                            >
                              <option value="">Sem categoria</option>
                              {categories.map((cat) => (
                                <React.Fragment key={cat.id}>
                                  <option value={cat.id}>📁 {cat.name}</option>
                                  {cat.subcategories && cat.subcategories.map((sub) => (
                                    <option key={sub.id} value={sub.id}>
                                      &nbsp;&nbsp;&nbsp;📄 {sub.name}
                                    </option>
                                  ))}
                                </React.Fragment>
                              ))}
                            </select>
                          </div>
                          <div className="product-edit-field">
                            <label className="product-edit-label">Valor</label>
                            <input
                              type="number"
                              value={editingProductData.value}
                              onChange={(e) => setEditingProductData({ ...editingProductData, value: e.target.value })}
                              placeholder="Valor de venda"
                              className="product-edit-input"
                            />
                          </div>
                          <div className="product-edit-field">
                            <label className="product-edit-label">Custo</label>
                            <input
                              type="number"
                              value={editingProductData.valuecusto}
                              onChange={(e) => setEditingProductData({ ...editingProductData, valuecusto: e.target.value })}
                              placeholder="Valor de custo"
                              className="product-edit-input"
                            />
                          </div>
                          <div className="product-edit-buttons">
                            <button 
                              onClick={() => handleUpdateProduct(product.id)} 
                              className="save-button"
                              disabled={isLoadingSave}
                            >
                              {isLoadingSave ? <FaSpinner className="loading-iconn" /> : "Salvar"}
                            </button>
                            <button 
                              onClick={() => setEditingProduct(null)} 
                              className="cancel-button"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        // Exibição normal do produto
                        <div className="product-info-display">
                          <span className="product-name">{product.name}</span>
                          <span className="product-quantity">{product.quantity}</span>
                          <span className="product-unit">{product.unit}</span>
                          <span className="product-category">
                            {product.category?.parent 
                              ? `${product.category.parent.name} > ${product.category.name}`
                              : product.category?.name || "Sem categoria"
                            }
                          </span>
                          <span className="product-value">{formatCurrency(product.value)}</span>
                          <span className="product-value">{formatCurrency(product.valuecusto)}</span>
                          <div className="product-actions">
                            <button onClick={() => handleEditProduct(product)} className="update-button">
                              Editar
                            </button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="delete-buttonn">
                              Excluir
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      </div>

      <button onClick={handleExportToExcel} className="export-button">
        Exportar para Excel
      </button>

      {/* Mensagens de confirmação */}
      {confirmDelete.show && (
        <Message 
          message="Tem certeza que deseja excluir este produto?" 
          type="warning" 
          onClose={cancelDeleteProduct} 
          onConfirm={confirmDeleteProduct} 
        />
      )}

      {confirmDeleteCategory.show && (
        <Message
          message="Deseja realmente excluir esta categoria?"
          type="warning"
          onClose={() => setConfirmDeleteCategory({ show: false, id: null })}
          onConfirm={() => handleDeleteCategory(confirmDeleteCategory.id)}
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
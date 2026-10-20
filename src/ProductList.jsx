import axios from "axios";
import React, { useEffect, useState } from "react";
import { FaSpinner, FaShoppingCart, FaBell, FaRedo, FaCheck } from "react-icons/fa";
import * as XLSX from "xlsx";
import Message from "./Message";
import "./ProductList.css";

const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("Unidade");
  const [baseUnit, setBaseUnit] = useState("");
  const [value, setPreco] = useState("");
  const [valuecusto, setPrecoCusto] = useState("");
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingProductData, setEditingProductData] = useState({});
  const [newUnit, setNewUnit] = useState("");
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitFilter, setUnitFilter] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  const [isUnitPricesModalOpen, setIsUnitPricesModalOpen] = useState(false);
  const [newProductUnitPrices, setNewProductUnitPrices] = useState({});
  const [unitPriceAddSel, setUnitPriceAddSel] = useState("");
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
  const [unitType, setUnitType] = useState("empacotada"); // "empacotada" | "porcao"
  const [selectedUnitForEquivalence, setSelectedUnitForEquivalence] = useState("");
  const [unitEquivalence, setUnitEquivalence] = useState("");
  const [fractionalValue, setFractionalValue] = useState(""); // quantas porções saem de 1 unidade-pai
  const [unitEquivalences, setUnitEquivalences] = useState({});

  // Estado de abas
  const [activeTab, setActiveTab] = useState("base"); // "base" | "compras"

  // ============ LISTA DE COMPRAS ============
  const [listaCompras, setListaCompras] = useState([]);
  const [listaFiltro, setListaFiltro] = useState("PENDENTE");
  const [isLoadingLista, setIsLoadingLista] = useState(false);
  const [expandedListaGroups, setExpandedListaGroups] = useState({});

  useEffect(() => {
    axios
      .get("https://api-start-pira.vercel.app/api/products")
      .then((response) => {
        setProducts(response.data);
        setFilteredProducts(response.data);
      })
      .catch((error) => {
        console.error("Erro ao buscar produtos:", error);
      });
  }, []);

  useEffect(() => {
    fetchListaCompras();
  }, []);

  const fetchListaCompras = () => {
    setIsLoadingLista(true);
    axios.get("https://api-start-pira.vercel.app/api/lista-compras")
      .then(res => setListaCompras(res.data))
      .catch(err => console.error("Erro ao buscar lista de compras:", err))
      .finally(() => setIsLoadingLista(false));
  };

  const handleConcluirListaItem = (id) => {
    axios.put(`https://api-start-pira.vercel.app/api/lista-compras/${id}/concluir`)
      .then(() => fetchListaCompras())
      .catch(() => setMessage({ show: true, text: "Erro ao concluir item!", type: "error" }));
  };

  const handleReabrirListaItem = (id) => {
    axios.put(`https://api-start-pira.vercel.app/api/lista-compras/${id}/reabrir`)
      .then(() => fetchListaCompras())
      .catch(() => setMessage({ show: true, text: "Erro ao reabrir item!", type: "error" }));
  };

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
    const filtered = products.filter(
      (product) => product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

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

  const handleAddProduct = () => {
    if (newProduct.trim() !== ""  && value.trim() !== "" && valuecusto.trim() !== "") {
      setIsLoading(true);
      const categoryId = selectedCategory ? parseInt(selectedCategory) : null;
      axios
        .post("https://api-start-pira.vercel.app/api/products", { 
          name: newProduct, 
          unit, 
          value, 
          valuecusto, 
          categoryId,
          baseUnit: baseUnit || null,
          unitPrices: newProductUnitPrices && typeof newProductUnitPrices === "object" ? newProductUnitPrices : {}
        })
        .then((response) => {
          setProducts([...products, response.data]);
          setNewProduct("");
          setUnit("Unidade");
          setBaseUnit("");
          setPreco("");
          setPrecoCusto("");
          setNewProductUnitPrices({});
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
    const isPorcao = unitType === "porcao";
    const equivalenceValue = isPorcao ? 1 : parseFloat(unitEquivalence);
    const fractionalVal = parseFloat(fractionalValue);

    if (!isPorcao && (unitEquivalence.trim() === "" || isNaN(equivalenceValue) || equivalenceValue <= 0)) {
      setMessage({ show: true, text: "Digite um número válido maior que zero!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (isPorcao && (fractionalValue.trim() === "" || isNaN(fractionalVal) || fractionalVal <= 0)) {
      setMessage({ show: true, text: "Informe um valor maior que zero para a equivalência (ex: 0,5 para meia unidade ou 9 para 1 Garrafa → 9 Doses)!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const isEditing = unitEquivalences[selectedUnitForEquivalence] !== undefined;

    const payload = isPorcao
      ? { isFractional: true, fractionalValue: fractionalVal }
      : { value: equivalenceValue, isFractional: false };
      
    const apiCall = isEditing 
      ? axios.put(`https://api-start-pira.vercel.app/api/unit-equivalences/${selectedUnitForEquivalence}`, payload)
      : axios.post("https://api-start-pira.vercel.app/api/unit-equivalences", {
          unitName: selectedUnitForEquivalence,
          ...payload
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
        setFractionalValue("");
        setUnitType("empacotada");
        setMessage({ 
          show: true, 
          text: isPorcao
            ? `Unidade "${selectedUnitForEquivalence}" adicionada: 1 unidade-pai → ${fractionalVal} ${selectedUnitForEquivalence}(s)`
            : `Equivalência ${isEditing ? 'atualizada' : 'definida'}: 1 ${selectedUnitForEquivalence} = ${equivalenceValue} Unidades`, 
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
    setUnitFilter("");
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
    const groups = products.reduce((groups, product) => {
      let categoryName = "Sem Categoria";
      if (product.category) {
        if (product.category.parent) {
          categoryName = `${product.category.parent.name} > ${product.category.name}`;
        } else {
          categoryName = product.category.name;
        }
      }
      
      if (!groups[categoryName]) {
        groups[categoryName] = [];
      }
      groups[categoryName].push(product);
      return groups;
    }, {});
    // Ordena os produtos de cada grupo alfabeticamente
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    });
    return groups;
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
      baseUnit: product.baseUnit || "",
      pdvHiddenUnits: product.pdvHiddenUnits || [],
      unitPrices: product.unitPrices && typeof product.unitPrices === "object" ? product.unitPrices : {},
      _productUnits: [...new Set([product.unit, ...((product.estoqueItems || []).map(e => e.unit))].filter(Boolean))],
    });
  };

  const handleUpdateProduct = (id) => {
    setIsLoadingSave(true);
    const { name, quantity, unit, value, valuecusto, categoryId, baseUnit, pdvHiddenUnits, unitPrices } = editingProductData;
    const finalCategoryId = categoryId ? parseInt(categoryId) : null;
    
    axios
      .put(`https://api-start-pira.vercel.app/api/products/${id}`, { 
        name, 
        quantity, 
        unit, 
        value, 
        valuecusto, 
        categoryId: finalCategoryId,
        baseUnit: baseUnit || null,
        pdvHiddenUnits: Array.isArray(pdvHiddenUnits) ? pdvHiddenUnits : [],
        unitPrices: unitPrices && typeof unitPrices === "object" ? unitPrices : {}
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
      <h2 className="fixed-title">Base de Cadastro</h2>

      {/* Abas */}
      <div className="pl-tabs">
        <button
          className={`pl-tab ${activeTab === "base" ? "pl-tab--active" : ""}`}
          onClick={() => setActiveTab("base")}
        >
          Base de Cadastro
        </button>
        <button
          className={`pl-tab ${activeTab === "compras" ? "pl-tab--active" : ""}`}
          onClick={() => { setActiveTab("compras"); fetchListaCompras(); }}
        >
          <FaShoppingCart style={{ marginRight: 5 }} />
          Lista de Compras
          {listaCompras.filter(i => i.status === "PENDENTE").length > 0 && (
            <span className="pl-tab-badge">{listaCompras.filter(i => i.status === "PENDENTE").length}</span>
          )}
        </button>
      </div>

      {/* ===== ABA BASE DE CADASTRO ===== */}
      {activeTab === "base" && (<>
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

      {isUnitPricesModalOpen && (() => {
        const creating = editingProduct === null;
        const up = creating ? (newProductUnitPrices || {}) : (editingProductData.unitPrices || {});
        const prodName = creating ? (newProduct || "Novo produto") : editingProductData.name;
        const defValue = creating ? value : editingProductData.value;
        const defCost = creating ? valuecusto : editingProductData.valuecusto;
        // Só as unidades comercializáveis DESTE produto:
        // na criação, a(s) unidade(s) definida(s) no formulário; na edição, unidade + itens de estoque.
        const baseUnits = creating
          ? [...new Set([unit, baseUnit].filter(Boolean))]
          : (editingProductData._productUnits || []);
        // Inclui também as unidades já configuradas em unitPrices (adicionadas manualmente).
        const allUnits = [...new Set([...baseUnits, ...Object.keys(up)])];
        // Unidades do catálogo global ainda não usadas por este produto.
        const addableUnits = Object.keys(unitEquivalences).filter((u) => !allUnits.includes(u));
        const setUP = (u, field, val) => {
          const apply = (prev) => {
            const next = { ...(prev || {}) };
            const entry = { ...(next[u] || {}) };
            if (val === "") delete entry[field];
            else entry[field] = parseFloat(val);
            if (Object.keys(entry).length === 0) delete next[u];
            else next[u] = entry;
            return next;
          };
          if (creating) setNewProductUnitPrices((prev) => apply(prev));
          else setEditingProductData((prev) => ({ ...prev, unitPrices: apply(prev.unitPrices) }));
        };
        // Adiciona uma unidade comercializável (pré-preenchida com os valores padrão do produto).
        const addUnit = (u) => {
          if (!u) return;
          const apply = (prev) => {
            const next = { ...(prev || {}) };
            if (!next[u]) {
              next[u] = {
                value: parseFloat(defValue) || 0,
                cost: parseFloat(defCost) || 0,
              };
            }
            return next;
          };
          if (creating) setNewProductUnitPrices((prev) => apply(prev));
          else setEditingProductData((prev) => ({ ...prev, unitPrices: apply(prev.unitPrices) }));
          setUnitPriceAddSel("");
        };
        // Remove uma unidade comercializável (limpa venda/custo configurados).
        const removeUnit = (u) => {
          const apply = (prev) => {
            const next = { ...(prev || {}) };
            delete next[u];
            return next;
          };
          if (creating) setNewProductUnitPrices((prev) => apply(prev));
          else setEditingProductData((prev) => ({ ...prev, unitPrices: apply(prev.unitPrices) }));
        };
        return (
        <div className="modal">
          <div className="modal-content">
            <h3 className="texto-add-unidade">Valores por unidade — {prodName}</h3>
            <p style={{ color: '#333', fontSize: '13px', marginBottom: '10px', textShadow: 'none' }}>
              Defina o valor de venda e de custo de cada unidade comercializável. Serão sugeridos automaticamente na entrada de estoque.
            </p>
            <div className="unit-prices-list">
              <div className="unit-prices-row unit-prices-row--head">
                <span>Unidade</span>
                <span>Venda (R$)</span>
                <span>Custo (R$)</span>
              </div>
              {allUnits.length === 0 ? (
                <p style={{ color: '#333', fontSize: '13px', margin: '8px 0', textShadow: 'none' }}>
                  Dê entrada no estoque ou adicione uma unidade abaixo para definir valores.
                </p>
              ) : allUnits.map((u) => {
                const cfg = up[u] || {};
                const podeRemover = !baseUnits.includes(u); // unidades com estoque não podem ser removidas
                return (
                  <div className="unit-prices-row" key={u}>
                    <span className="unit-prices-name">
                      <button
                        type="button"
                        className="unit-prices-remove"
                        title={podeRemover ? "Remover unidade comercializável" : "Limpar valores (unidade com estoque)"}
                        onClick={() => removeUnit(u)}
                        style={{ marginRight: 6, border: 'none', background: 'transparent', color: '#c0392b', cursor: 'pointer', fontWeight: 'bold', fontSize: 16, lineHeight: 1, textShadow: 'none' }}
                      >
                        ×
                      </button>
                      {u}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={String(defValue ?? "")}
                      value={cfg.value ?? ""}
                      onChange={(e) => setUP(u, "value", e.target.value)}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={String(defCost ?? "")}
                      value={cfg.cost ?? ""}
                      onChange={(e) => setUP(u, "cost", e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
            {addableUnits.length > 0 && (
              <div className="unit-prices-add" style={{ marginTop: 10 }}>
                <select
                  value={unitPriceAddSel}
                  onChange={(e) => addUnit(e.target.value)}
                  style={{ width: '100%', padding: '8px', borderRadius: 6 }}
                >
                  <option value="">+ Adicionar unidade comercializável…</option>
                  {addableUnits.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="modal-buttons">
              <button onClick={() => setIsUnitPricesModalOpen(false)}>Concluir</button>
            </div>
          </div>
        </div>
        );
      })()}

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
              {unitEquivalences[selectedUnitForEquivalence] !== undefined ? 'Editar Unidade' : 'Nova Unidade'}: {selectedUnitForEquivalence}
            </h3>

            <p style={{ color: '#333', fontSize: '13px', marginBottom: '10px', textShadow: 'none', fontWeight: 600 }}>
              Tipo de unidade:
            </p>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#333', textShadow: 'none' }}>
                <input
                  type="radio"
                  name="unitType"
                  value="empacotada"
                  checked={unitType === "empacotada"}
                  onChange={() => setUnitType("empacotada")}
                />
                📦 Empacotada (Fardo, Caixa…)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px', color: '#333', textShadow: 'none' }}>
                <input
                  type="radio"
                  name="unitType"
                  value="porcao"
                  checked={unitType === "porcao"}
                  onChange={() => setUnitType("porcao")}
                />
                🥃 Porção / Dose (Dose, Taça, Copo…)
              </label>
            </div>

            {unitType === "empacotada" ? (
              <>
                <p style={{ color: '#333', fontSize: '14px', marginBottom: '8px', textShadow: 'none' }}>
                  Quantas <strong>Unidades</strong> representa 1 {selectedUnitForEquivalence}?
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
                <p style={{ color: '#666', fontSize: '12px', marginTop: '8px', textShadow: 'none' }}>
                  Exemplo: 1 {selectedUnitForEquivalence} = {unitEquivalence || '?'} Unidades
                </p>
              </>
            ) : (
              <>
                <div style={{ background: '#f0f7ff', border: '1px solid #b3d1f7', borderRadius: '8px', padding: '12px', fontSize: '13px', color: '#1a4d8a', textShadow: 'none', marginBottom: '12px' }}>
                  <strong>Unidade fracional</strong> — representa uma porção gerada a partir de uma unidade-pai (ex: 1 Garrafa → 9 Doses).<br /><br />
                  Informe abaixo <strong>quantas {selectedUnitForEquivalence || 'porções'}</strong> saem de <strong>1 unidade-pai</strong>:
                </div>
                <input
                  className="texto-unidade"
                  type="number"
                  value={fractionalValue}
                  onChange={(e) => setFractionalValue(e.target.value)}
                  placeholder="Ex: 9 (1 Garrafa → 9 Doses) ou 0,5 (metade)"
                  min="0.01"
                  step="any"
                />
                {fractionalValue && parseFloat(fractionalValue) > 0 && (
                  <p style={{ color: '#1a4d8a', fontSize: '12px', marginTop: '8px', textShadow: 'none' }}>
                    1 unidade-pai → <strong>{fractionalValue} {selectedUnitForEquivalence}(s)</strong>
                  </p>
                )}
              </>
            )}

            <div className="modal-buttons" style={{ marginTop: '16px' }}>
              <button onClick={handleSaveUnitEquivalence}>
                {unitEquivalences[selectedUnitForEquivalence] !== undefined ? 'Atualizar' : 'Confirmar'}
              </button>
              <button onClick={() => {
                setIsUnitEquivalenceModalOpen(false);
                setSelectedUnitForEquivalence("");
                setUnitEquivalence("");
                setFractionalValue("");
                setUnitType("empacotada");
              }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Formulário de entrada */}
      <div className="input-group" onKeyDown={(e) => { if (e.key === "Enter") handleAddProduct(); }}>
        <input 
          type="text" 
          value={newProduct} 
          onChange={(e) => setNewProduct(e.target.value)} 
          placeholder="Nome do Produto" 
          disabled={isLoading} 
        />
        {/* <input 
          type="number" 
          value={quantity} 
          onChange={(e) => setQuantity(e.target.value)} 
          placeholder="Quantidade" 
          disabled={isLoading} 
        /> */}
        <input 
          type="number" 
          value={value} 
          onChange={(e) => setPreco(e.target.value)} 
          placeholder="Valor (R$)" 
          disabled={isLoading} 
        />
        <input 
          type="number" 
          value={valuecusto} 
          onChange={(e) => setPrecoCusto(e.target.value)} 
          placeholder="Custo (R$)" 
          disabled={isLoading} 
        />
        
        {/* Seletor de unidades */}
        <div className="custom-select">
          <div className="selected-unit">
            {unit || "Selecione uma unidade"}
            {unit && unit !== "Unidade" && unitEquivalences[unit] > 1 && (
              <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px', textShadow: 'none' }}>
                (1 = {unitEquivalences[unit]} un.)
              </span>
            )}
          </div>
          <ul className="unit-dropdown">
            <li>
              <input
                type="text"
                className="expense-filter-input"
                placeholder="Filtrar unidades..."
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </li>
            <li className="unit-item">
              <span className="unit-name" onClick={() => { setUnit("Unidade"); setUnitFilter(""); }}>
                Unidade
              </span>
            </li>
            {Object.keys(unitEquivalences)
              .filter((u) => u !== "Unidade" && u.toLowerCase().includes(unitFilter.toLowerCase()))
              .map((u, index) => (
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

        {/* Seletor de unidade base (unitária = 1) */}
        <select
          className="base-unit-select"
          value={baseUnit}
          onChange={(e) => setBaseUnit(e.target.value)}
          disabled={isLoading}
          title="Unidade de referência para conversão. Vazio = automático (menor unidade cadastrada)."
        >
          <option value="">Ref.: automática</option>
          {Object.keys(unitEquivalences).map((u, index) => (
            <option key={index} value={u}>{u}</option>
          ))}
        </select>
        
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
        
        <button
          type="button"
          style={{ marginTop: '19px', textShadow: 'none' }}
          className="unit-prices-open-btn create-unit-prices-btn"
          onClick={() => { setEditingProduct(null); setIsUnitPricesModalOpen(true); }}
          disabled={isLoading}
          title="Definir valor de venda/custo por unidade para o novo produto"
        >
          💲 Valores por unidade
        </button>

        <button onClick={handleAddProduct} disabled={isLoading}>
          {isLoading ? <FaSpinner className="loading-iconn" /> : "Adicionar Produto"}
        </button>
      </div>

      {/* Lista de produtos */}
      <div className="product-list">
        {/* Cabeçalho da lista */}
        <div className="product-list-header">
          <span className="header-name">Nome do Produto</span>
          <span className="header-unit">Unidade</span>
          <span className="header-category">Categoria</span>
          <span className="header-value">Valor</span>
          <span className="header-value">Custo</span>
          <span className="header-units">Un. comercializáveis</span>
          <span className="header-actions">Ações</span>
        </div>

        {/* Lista agrupada por categoria */}
        <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
          {Object.entries(groupProductsByCategory(filteredProducts))
            .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
            .map(([categoryName, categoryProducts]) => (
            <li key={categoryName} className="product-group">
              <div className="group-header" onClick={() => toggleGroup(categoryName)}>
                <span>{categoryName}</span>
                <span>{categoryProducts.length} produtos</span>
                <button 
                  className="botao-expend"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleGroup(categoryName);
                  }}
                >
                  {expandedGroups[categoryName] ? "Ocultar" : "Expandir"}
                </button>
              </div>
              {expandedGroups[categoryName] && (
                <ul className="group-details">
                  {categoryProducts.map((product) => (
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
                          {/* <div className="product-edit-field">
                            <label className="product-edit-label">Quantidade</label>
                            <input
                              type="number"
                              value={editingProductData.quantity}
                              onChange={(e) => setEditingProductData({ ...editingProductData, quantity: e.target.value })}
                              placeholder="Quantidade"
                              className="product-edit-input"
                            />
                          </div> */}
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
                            <label className="product-edit-label">Unidade de referência</label>
                            <select 
                              value={editingProductData.baseUnit || ""} 
                              onChange={(e) => setEditingProductData({ ...editingProductData, baseUnit: e.target.value })}
                              className="product-edit-input"
                              title="Unidade de referência para conversão. Vazio = automático (menor unidade)."
                            >
                              <option value="">Automático (menor unidade)</option>
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
                          <div className="product-edit-field product-edit-field--pdv-units">
                            <label className="product-edit-label">Unidades no PDV</label>
                            {(editingProductData._productUnits || []).length === 0 ? (
                              <span className="pdv-units-hint">Dê entrada no estoque para configurar as unidades vendáveis.</span>
                            ) : (
                              <div className="pdv-units-list">
                                {(editingProductData._productUnits || []).map((u) => {
                                  const hidden = (editingProductData.pdvHiddenUnits || []).includes(u);
                                  return (
                                    <label key={u} className="pdv-unit-checkbox" title={hidden ? "Oculto no PDV" : "Aparece no PDV"}>
                                      <input
                                        type="checkbox"
                                        checked={!hidden}
                                        onChange={(e) => {
                                          const current = editingProductData.pdvHiddenUnits || [];
                                          const next = e.target.checked
                                            ? current.filter((x) => x !== u)
                                            : [...current, u];
                                          setEditingProductData({ ...editingProductData, pdvHiddenUnits: next });
                                        }}
                                      />
                                      <span>{u}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="product-edit-field product-edit-field--pdv-units">
                            <label className="product-edit-label">Valores por unidade</label>
                            <button
                              type="button"
                              style={{ textShadow: 'none' }}
                              className="unit-prices-open-btn"
                              onClick={() => setIsUnitPricesModalOpen(true)}
                            >
                              💲 Valores de venda/custo por unidade
                            </button>
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
                          <span className="product-unit">{product.unit}</span>
                          <span className="product-category">
                            {product.category?.parent 
                              ? `${product.category.parent.name} > ${product.category.name}`
                              : product.category?.name || "Sem categoria"
                            }
                          </span>
                          <span className="product-value">{formatCurrency(product.value)}</span>
                          <span className="product-value">{formatCurrency(product.valuecusto)}</span>
                          <span className="product-units">
                            {(() => {
                              const entries = Object.entries(product.unitPrices || {}).filter(
                                ([, cfg]) => cfg && (cfg.value != null || cfg.cost != null)
                              );
                              if (entries.length === 0) return <span className="product-units-empty">—</span>;
                              return entries.map(([u, cfg]) => (
                                <span className="product-unit-chip" key={u} title={`${u} — Venda: ${formatCurrency(cfg.value ?? product.value)} · Custo: ${formatCurrency(cfg.cost ?? product.valuecusto)}`}>
                                  <strong>{u}</strong>
                                  <span className="product-unit-chip-vals">
                                    V: {formatCurrency(cfg.value ?? product.value)} · C: {formatCurrency(cfg.cost ?? product.valuecusto)}
                                  </span>
                                </span>
                              ));
                            })()}
                          </span>
                          <div className="product-actions">
                            <button onClick={() => handleEditProduct(product)} className="update-button">
                              Editar
                            </button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="delete-button">
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

      </>)}

      {/* ===== ABA LISTA DE COMPRAS ===== */}
      {activeTab === "compras" && (
        <div className="pl-lista-section">
          <div className="pl-lista-header">
            <div className="pl-lista-filtros">
              {["PENDENTE", "CONCLUIDO", "TODOS"].map(f => (
                <button
                  key={f}
                  className={`pl-lista-filtro-btn ${listaFiltro === f ? "pl-lista-filtro-btn--active" : ""}`}
                  onClick={() => setListaFiltro(f)}
                >
                  {f === "PENDENTE" ? "Pendentes" : f === "CONCLUIDO" ? "Concluídos" : "Todos"}
                </button>
              ))}
              <button className="pl-lista-refresh-btn" onClick={fetchListaCompras} title="Atualizar">
                <FaRedo size={12} />
              </button>
            </div>
          </div>

          {isLoadingLista ? (
            <div className="pl-lista-loading"><FaSpinner className="loading-iconn" /> Carregando...</div>
          ) : (() => {
            const filtrados = listaCompras.filter(i =>
              listaFiltro === "TODOS" ? true : i.status === listaFiltro
            );
            if (filtrados.length === 0) return (
              <div className="pl-lista-empty">
                {listaFiltro === "PENDENTE" ? "✅ Nenhum produto abaixo do estoque mínimo!" : "Nenhum item encontrado."}
              </div>
            );
            const grouped = {};
            filtrados.forEach(item => {
              const cat = item.estoque?.category?.parent
                ? `${item.estoque.category.parent.name} › ${item.estoque.category.name}`
                : item.estoque?.category?.name || "Sem Categoria";
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(item);
            });
            return Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="pl-lista-group">
                <div className="pl-lista-group-header" onClick={() => setExpandedListaGroups(prev => ({ ...prev, [cat]: !prev[cat] }))}>
                  <span>📁 {cat} <small>({items.length})</small></span>
                  <button className="pl-lista-expand-btn">{expandedListaGroups[cat] === false ? "Expandir" : "Ocultar"}</button>
                </div>
                {expandedListaGroups[cat] !== false && (
                  <div className="pl-lista-items">
                    {items.map(item => (
                      <div key={item.id} className={`pl-lista-item ${item.status === "CONCLUIDO" ? "pl-lista-item--done" : ""}`}>
                        <div className="pl-lista-item-left">
                          {item.status === "CONCLUIDO"
                            ? <FaCheck className="pl-lista-item-icon pl-lista-item-icon--done" />
                            : <FaBell className="pl-lista-item-icon pl-lista-item-icon--pending" />
                          }
                          <div className="pl-lista-item-info">
                            <span className="pl-lista-item-nome">{item.nomeProduto}</span>
                            <span className="pl-lista-item-qtd">
                              Atual: <strong>{item.quantidadeAtual} {item.estoque?.unit || ""}</strong>
                              &nbsp;/&nbsp;Mínimo: <strong>{item.quantidadeMinima} {item.estoque?.unit || ""}</strong>
                            </span>
                            {item.status === "CONCLUIDO" && item.concluidoEm && (
                              <span className="pl-lista-item-data">Conclufdo em {new Date(item.concluidoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                            )}
                            {item.status === "PENDENTE" && (
                              <span className="pl-lista-item-data">Registrado em {new Date(item.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                            )}
                          </div>
                        </div>
                        <div className="pl-lista-item-actions">
                          {item.status === "PENDENTE"
                            ? <button className="pl-lista-btn-concluir" onClick={() => handleConcluirListaItem(item.id)} title="Marcar como conclufdo"><FaCheck /></button>
                            : <button className="pl-lista-btn-reabrir" onClick={() => handleReabrirListaItem(item.id)} title="Reabrir"><FaRedo /></button>
                          }
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ));
          })()}
        </div>
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
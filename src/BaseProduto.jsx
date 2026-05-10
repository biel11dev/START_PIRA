import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { FaSpinner, FaExchangeAlt, FaPlus, FaBoxOpen } from "react-icons/fa";
import * as XLSX from "xlsx";
import Message from "./Message";
import { AuthContext } from "./AuthContext";
import "./BaseProduto.css";

const API_URL = "https://api-start-pira.vercel.app";

const ProductList = () => {
  const { auth } = useContext(AuthContext);
  const [estoqueItems, setEstoqueItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [unitEquivalences, setUnitEquivalences] = useState({});
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState(null);

  // Modal de entrada de estoque
  const [showEntradaModal, setShowEntradaModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [entradaQuantity, setEntradaQuantity] = useState("");
  const [entradaUnit, setEntradaUnit] = useState("Unidade");
  const [productSearch, setProductSearch] = useState("");
  const [filteredCatalog, setFilteredCatalog] = useState([]);
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);

  // Modal de conversão
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertItem, setConvertItem] = useState(null);
  const [convertQuantity, setConvertQuantity] = useState("1");
  const [convertDirection, setConvertDirection] = useState("toUnit"); // "toUnit" ou "fromUnit"
  const [convertTargetUnit, setConvertTargetUnit] = useState("");

  // Edição
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingProductData, setEditingProductData] = useState({});

  // Confirmação de exclusão
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Buscar dados ao carregar
  useEffect(() => {
    fetchEstoque();
    fetchCatalog();
    fetchCategories();
    fetchUnitEquivalences();
  }, []);

  // Filtrar estoque
  useEffect(() => {
    const filtered = estoqueItems.filter(
      (item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [searchTerm, estoqueItems]);

  // Filtrar catálogo no dropdown de entrada
  useEffect(() => {
    if (productSearch.length > 0) {
      const filtered = catalogProducts.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
      );
      setFilteredCatalog(filtered.slice(0, 20));
      setShowCatalogDropdown(true);
    } else {
      setFilteredCatalog(catalogProducts.slice(0, 20));
    }
  }, [productSearch, catalogProducts]);

  const fetchEstoque = () => {
    axios.get(`${API_URL}/api/estoque_prod`)
      .then((res) => {
        setEstoqueItems(res.data);
        setFilteredItems(res.data);
      })
      .catch((err) => console.error("Erro ao buscar estoque:", err));
  };

  const fetchCatalog = () => {
    axios.get(`${API_URL}/api/products`)
      .then((res) => setCatalogProducts(res.data))
      .catch((err) => console.error("Erro ao buscar catálogo:", err));
  };

  const fetchCategories = () => {
    axios.get(`${API_URL}/api/categories`)
      .then((res) => setCategories(res.data))
      .catch((err) => console.error("Erro ao buscar categorias:", err));
  };

  const fetchUnitEquivalences = () => {
    axios.get(`${API_URL}/api/unit-equivalences`)
      .then((res) => {
        const obj = res.data.reduce((acc, eq) => {
          acc[eq.unitName] = eq.value;
          return acc;
        }, {});
        obj["Unidade"] = 1;
        setUnitEquivalences(obj);
      })
      .catch((err) => {
        console.error("Erro ao buscar equivalências:", err);
        setUnitEquivalences({ "Unidade": 1, "Maço": 20, "Fardo": 12, "Pacote": 10 });
      });
  };

  // Formatar moeda
  const formatCurrency = (value) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  // Agrupar por categoria
  const groupByCategory = (items) => {
    const hierarchy = {};
    items.forEach(item => {
      let parentName = "Sem Categoria";
      let subcategoryName = null;
      if (item.category) {
        if (item.category.parent) {
          parentName = item.category.parent.name;
          subcategoryName = item.category.name;
        } else {
          parentName = item.category.name;
        }
      }
      if (!hierarchy[parentName]) {
        hierarchy[parentName] = { totalCount: 0, subcategories: {} };
      }
      const subKey = subcategoryName || '_direct';
      if (!hierarchy[parentName].subcategories[subKey]) {
        hierarchy[parentName].subcategories[subKey] = [];
      }
      hierarchy[parentName].subcategories[subKey].push(item);
      hierarchy[parentName].totalCount++;
    });
    return hierarchy;
  };

  const toggleGroup = (name) => {
    setExpandedGroups(prev => ({ ...prev, [name]: !prev[name] }));
  };

  // ============ ENTRADA DE ESTOQUE ============
  const openEntradaModal = () => {
    setShowEntradaModal(true);
    setSelectedProductId("");
    setEntradaQuantity("");
    setEntradaUnit("Unidade");
    setProductSearch("");
  };

  const handleSelectCatalogProduct = (product) => {
    setSelectedProductId(product.id);
    setProductSearch(product.name);
    setEntradaUnit(product.unit || "Unidade");
    setShowCatalogDropdown(false);
  };

  const handleEntradaSubmit = () => {
    if (!selectedProductId || !entradaQuantity) {
      setMessage({ show: true, text: "Selecione um produto e informe a quantidade!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setIsLoading(true);
    axios.post(`${API_URL}/api/estoque_prod/entrada`, {
      productId: selectedProductId,
      quantity: parseInt(entradaQuantity),
      unit: entradaUnit
    })
      .then(() => {
        setMessage({ show: true, text: "Entrada registrada com sucesso!", type: "success" });
        setShowEntradaModal(false);
        fetchEstoque();
        setTimeout(() => setMessage(null), 3000);
      })
      .catch((err) => {
        const errorMsg = err.response?.data?.error || "Erro ao registrar entrada!";
        setMessage({ show: true, text: errorMsg, type: "error" });
        setTimeout(() => setMessage(null), 5000);
      })
      .finally(() => setIsLoading(false));
  };

  // ============ CONVERSÃO DE UNIDADES ============
  const openConvertModal = (item) => {
    setConvertItem(item);
    setConvertQuantity("1");
    if (item.unit === "Unidade") {
      setConvertDirection("fromUnit");
      // Selecionar a primeira unidade empacotada disponível
      const packedUnits = Object.keys(unitEquivalences).filter(u => u !== "Unidade" && unitEquivalences[u] > 1);
      setConvertTargetUnit(packedUnits.length > 0 ? packedUnits[0] : "");
    } else {
      setConvertDirection("toUnit");
      setConvertTargetUnit("");
    }
    setShowConvertModal(true);
  };

  const getConversionPreview = () => {
    if (!convertItem || !convertQuantity) return null;
    const qty = parseInt(convertQuantity) || 0;
    if (qty <= 0) return null;

    if (convertDirection === "toUnit") {
      // Empacotado → Unidade
      const factor = unitEquivalences[convertItem.unit];
      if (!factor || factor <= 1) return null;
      return {
        from: `${qty}x ${convertItem.unit}`,
        to: `${qty * factor}x Unidade`,
        factor: factor
      };
    } else {
      // Unidade → Empacotado
      if (!convertTargetUnit) return null;
      const factor = unitEquivalences[convertTargetUnit];
      if (!factor || factor <= 1) return null;
      const unitsNeeded = qty * factor;
      return {
        from: `${unitsNeeded}x Unidade`,
        to: `${qty}x ${convertTargetUnit}`,
        factor: factor,
        unitsNeeded: unitsNeeded
      };
    }
  };

  const handleConvertSubmit = () => {
    if (!convertItem || !convertQuantity) return;

    setIsLoading(true);

    if (convertDirection === "toUnit") {
      // Empacotado → Unidade
      axios.post(`${API_URL}/api/estoque_prod/converter`, {
        estoqueId: convertItem.id,
        quantityToConvert: parseInt(convertQuantity)
      })
        .then((res) => {
          const { origin, destination } = res.data;
          setMessage({
            show: true,
            text: `Convertido! ${origin.removed}x ${origin.unit} → ${destination.added}x Unidade`,
            type: "success"
          });
          setShowConvertModal(false);
          fetchEstoque();
          setTimeout(() => setMessage(null), 4000);
        })
        .catch((err) => {
          const errorMsg = err.response?.data?.error || "Erro ao converter unidade!";
          setMessage({ show: true, text: errorMsg, type: "error" });
          setTimeout(() => setMessage(null), 5000);
        })
        .finally(() => setIsLoading(false));
    } else {
      // Unidade → Empacotado (reverso)
      axios.post(`${API_URL}/api/estoque_prod/converter-reverso`, {
        estoqueId: convertItem.id,
        targetUnit: convertTargetUnit,
        quantityPacked: parseInt(convertQuantity)
      })
        .then((res) => {
          const { origin, destination } = res.data;
          setMessage({
            show: true,
            text: `Convertido! ${origin.removed}x Unidade → ${destination.added}x ${destination.unit}`,
            type: "success"
          });
          setShowConvertModal(false);
          fetchEstoque();
          setTimeout(() => setMessage(null), 4000);
        })
        .catch((err) => {
          const errorMsg = err.response?.data?.error || "Erro ao converter unidade!";
          setMessage({ show: true, text: errorMsg, type: "error" });
          setTimeout(() => setMessage(null), 5000);
        })
        .finally(() => setIsLoading(false));
    }
  };

  // ============ EDIÇÃO ============
  const handleUpdateProduct = (product) => {
    setEditingProduct(product.id);
    setEditingProductData({
      name: product.name,
      quantity: product.quantity,
      unit: product.unit,
      value: product.value,
      valuecusto: product.valuecusto,
      categoryId: product.categoria_Id || "",
    });
  };

  const handleSaveProduct = () => {
    if (!editingProduct) return;
    const { name, quantity, unit, value, valuecusto, categoryId } = editingProductData;
    const finalCategoryId = categoryId ? parseInt(categoryId) : null;
    axios
      .put(`${API_URL}/api/estoque_prod/${editingProduct}`, {
        name, quantity, unit, value, valuecusto, categoryId: finalCategoryId
      })
      .then((res) => {
        setEstoqueItems(estoqueItems.map(item => item.id === editingProduct ? res.data : item));
        setEditingProduct(null);
        setEditingProductData({});
        setMessage({ show: true, text: "Produto atualizado!", type: "success" });
        setTimeout(() => setMessage(null), 3000);
      })
      .catch(() => {
        setMessage({ show: true, text: "Erro ao atualizar!", type: "error" });
        setTimeout(() => setMessage(null), 3000);
      });
  };

  // ============ EXCLUSÃO ============
  const handleDeleteProduct = (id) => {
    setConfirmDelete({ show: true, id });
    setDeletePassword("");
  };

  const confirmDeleteProduct = async () => {
    const { id } = confirmDelete;
    if (!deletePassword) {
      setMessage({ show: true, text: "Digite sua senha para confirmar!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setDeleteLoading(true);
    try {
      // Verificar senha do usuário logado
      const username = auth?.userName || localStorage.getItem("userName");
      await axios.post(`${API_URL}/api/verify-password`, {
        username,
        password: deletePassword,
      });

      // Senha correta, prosseguir com exclusão
      await axios.delete(`${API_URL}/api/estoque_prod/${id}`);
      setEstoqueItems(estoqueItems.filter(p => p.id !== id));
      setConfirmDelete({ show: false, id: null });
      setDeletePassword("");
      setMessage({ show: true, text: "Produto excluído!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || "Erro ao excluir!";
      setMessage({ show: true, text: errorMsg, type: "error" });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ============ EXPORTAR ============
  const handleExportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      estoqueItems.map((item) => ({
        ID: item.id,
        Produto: item.name,
        Quantidade: item.quantity,
        Unidade: item.unit,
        "Em Unidades": item.quantity * (unitEquivalences[item.unit] || 1),
        Categoria: item.category?.name || "Sem categoria",
        Valor: formatCurrency(item.value),
        Custo: formatCurrency(item.valuecusto),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estoque");
    XLSX.writeFile(workbook, "estoque-produtos.xlsx");
  };

  const conversionPreview = getConversionPreview();

  // Obter unidades disponíveis (das equivalências)
  const availableUnits = Object.keys(unitEquivalences);

  return (
    <div className="bp-container">
      <h2 className="bp-title">Estoque</h2>

      {/* Barra superior */}
      <div className="bp-top-bar">
        <div className="bp-search">
          <input
            type="text"
            placeholder="Pesquisar produtos no estoque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="bp-btn-entrada" onClick={openEntradaModal}>
          <FaPlus /> Entrada de Estoque
        </button>
      </div>

      {/* Header da tabela */}
      <div className="bp-header">
        <div className="bp-header-container">
          <div className="bp-header-col">PRODUTO</div>
          <div className="bp-header-col">QTD</div>
          <div className="bp-header-col">UNIDADE</div>
          <div className="bp-header-col">EM UN.</div>
          <div className="bp-header-col">CATEGORIA</div>
          <div className="bp-header-col">VALOR UN</div>
          <div className="bp-header-col">CUSTO</div>
        </div>
        <div className="bp-header-actions">AÇÕES</div>
      </div>

      {/* Lista de produtos agrupados */}
      <ul className="bp-list">
        {Object.entries(groupByCategory(filteredItems)).map(([parentName, parentData]) => (
          <li key={parentName} className="bp-group">
            <div className="bp-group-header parent-category-header" onClick={() => toggleGroup(parentName)}>
              <div className="bp-group-title"><span>📁 {parentName}</span></div>
              <div className="bp-group-info">
                <span className="bp-group-count">{parentData.totalCount} itens</span>
                <button className="bp-expand-btn" onClick={(e) => { e.stopPropagation(); toggleGroup(parentName); }}>
                  {expandedGroups[parentName] ? "Ocultar" : "Expandir"}
                </button>
              </div>
            </div>

            {expandedGroups[parentName] && (
              <ul className="bp-subcategory-list">
                {Object.entries(parentData.subcategories).map(([subName, subItems]) => (
                  <li key={`${parentName}-${subName}`} className="bp-subgroup">
                    <div className="bp-group-header subcategory-header" onClick={() => toggleGroup(`${parentName}-${subName}`)}>
                      <div className="bp-group-title">
                        <span>{subName === '_direct' ? '📄 Produtos diretos' : `📄 ${subName}`}</span>
                      </div>
                      <div className="bp-group-info">
                        <span className="bp-group-count">{subItems.length} itens</span>
                        <button className="bp-expand-btn" onClick={(e) => { e.stopPropagation(); toggleGroup(`${parentName}-${subName}`); }}>
                          {expandedGroups[`${parentName}-${subName}`] ? "Ocultar" : "Expandir"}
                        </button>
                      </div>
                    </div>

                    {expandedGroups[`${parentName}-${subName}`] && (
                      <ul className="bp-details">
                        {subItems.map((item) => (
                          <li className="bp-item" key={item.id}>
                            {editingProduct === item.id ? (
                              <div className="bp-edit-form">
                                <div className="bp-edit-field">
                                  <label className="bp-edit-label">Quantidade</label>
                                  <input className="bp-edit-input" type="number" value={editingProductData.quantity}
                                    onChange={(e) => setEditingProductData({ ...editingProductData, quantity: e.target.value })} />
                                </div>
                                <div className="bp-edit-field">
                                  <label className="bp-edit-label">Valor Venda</label>
                                  <input className="bp-edit-input" type="number" step="0.01" value={editingProductData.value}
                                    onChange={(e) => setEditingProductData({ ...editingProductData, value: e.target.value })} />
                                </div>
                                <div className="bp-edit-field">
                                  <label className="bp-edit-label">Custo</label>
                                  <input className="bp-edit-input" type="number" step="0.01" value={editingProductData.valuecusto}
                                    onChange={(e) => setEditingProductData({ ...editingProductData, valuecusto: e.target.value })} />
                                </div>
                                <div className="bp-edit-buttons">
                                  <button className="bp-btn-save" onClick={handleSaveProduct}>Salvar</button>
                                  <button className="bp-btn-cancel" onClick={() => setEditingProduct(null)}>Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="bp-info-container">
                                  <div className="bp-info-row">
                                    <span className="bp-info-value">{item.name}</span>
                                  </div>
                                  <div className="bp-info-row">
                                    <span className={`bp-info-value ${item.quantity <= 3 ? 'bp-low-stock' : ''}`}>
                                      {item.quantity}
                                    </span>
                                  </div>
                                  <div className="bp-info-row">
                                    <span className="bp-info-value">{item.unit}</span>
                                  </div>
                                  <div className="bp-info-row">
                                    <span className="bp-info-value bp-unit-total">
                                      {item.quantity * (unitEquivalences[item.unit] || 1)}
                                    </span>
                                  </div>
                                  <div className="bp-info-row">
                                    <span className="bp-info-value">
                                      {item.category?.parent
                                        ? `${item.category.parent.name} > ${item.category.name}`
                                        : item.category?.name || "—"
                                      }
                                    </span>
                                  </div>
                                  <div className="bp-info-row">
                                    <span className="bp-value-destaquee">{formatCurrency(item.value)}</span>
                                  </div>
                                  <div className="bp-info-row">
                                    <span className="bp-value-destaque">{formatCurrency(item.valuecusto)}</span>
                                  </div>
                                </div>
                                <div className="bp-actions">
                                  {((item.unit !== "Unidade" && unitEquivalences[item.unit]) || 
                                    (item.unit === "Unidade" && Object.keys(unitEquivalences).some(u => u !== "Unidade" && unitEquivalences[u] > 1))) && (
                                    <button className="bp-btn-convert" onClick={() => openConvertModal(item)} title={item.unit === "Unidade" ? "Empacotar unidades" : "Converter para unidades"}>
                                      <FaExchangeAlt />
                                    </button>
                                  )}
                                  <button className="bp-btn-update" onClick={() => handleUpdateProduct(item)}>Editar</button>
                                  <button className="bp-btn-delete" onClick={() => handleDeleteProduct(item.id)}>Excluir</button>
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
            )}
          </li>
        ))}
      </ul>

      <button onClick={handleExportToExcel} className="bp-btn-export">Exportar para Excel</button>

      {/* ============ MODAL ENTRADA DE ESTOQUE ============ */}
      {showEntradaModal && (
        <div className="bp-modal">
          <div className="bp-modal-content bp-modal-entrada">
            <h3 className="bp-modal-title"><FaBoxOpen /> Entrada de Estoque</h3>

            <div className="bp-entrada-field">
              <label>Produto (do catálogo):</label>
              <div className="bp-autocomplete">
                <input
                  className="bp-autocomplete-input"
                  type="text"
                  value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    setSelectedProductId("");
                    setShowCatalogDropdown(true);
                  }}
                  onFocus={() => setShowCatalogDropdown(true)}
                  onBlur={() => setTimeout(() => setShowCatalogDropdown(false), 200)}
                  placeholder="Buscar produto no catálogo..."
                />
                {showCatalogDropdown && filteredCatalog.length > 0 && (
                  <ul className="bp-suggestions">
                    {filteredCatalog.map((p) => (
                      <li key={p.id} onClick={() => handleSelectCatalogProduct(p)}>
                        <strong>{p.name}</strong>
                        <span className="bp-suggestion-detail">
                          {p.unit} | {formatCurrency(p.value)} | {p.category?.name || "Sem cat."}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {selectedProductId && (
                <div className="bp-selected-product-info">
                  ✅ Produto selecionado: <strong>{productSearch}</strong>
                </div>
              )}
            </div>

            <div className="bp-entrada-row">
              <div className="bp-entrada-field">
                <label>Quantidade:</label>
                <input
                  type="number"
                  min="1"
                  value={entradaQuantity}
                  onChange={(e) => setEntradaQuantity(e.target.value)}
                  placeholder="Ex: 5"
                />
              </div>
              <div className="bp-entrada-field">
                <label>Unidade:</label>
                <select value={entradaUnit} onChange={(e) => setEntradaUnit(e.target.value)}>
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>
                      {u} {unitEquivalences[u] > 1 ? `(${unitEquivalences[u]} un.)` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {entradaQuantity && entradaUnit && unitEquivalences[entradaUnit] > 1 && (
              <div className="bp-conversion-info">
                📦 {entradaQuantity}x {entradaUnit} = <strong>{parseInt(entradaQuantity || 0) * unitEquivalences[entradaUnit]}</strong> unidades no total
              </div>
            )}

            <div className="bp-modal-buttons">
              <button onClick={handleEntradaSubmit} disabled={isLoading || !selectedProductId || !entradaQuantity}>
                {isLoading ? <FaSpinner className="bp-loading" /> : "Confirmar Entrada"}
              </button>
              <button onClick={() => setShowEntradaModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL CONVERSÃO ============ */}
      {showConvertModal && convertItem && (
        <div className="bp-modal">
          <div className="bp-modal-content bp-modal-convert">
            <h3 className="bp-modal-title"><FaExchangeAlt /> Converter Unidade</h3>

            <div className="bp-convert-info">
              <p><strong>{convertItem.name}</strong></p>
              <p>Estoque atual: <strong>{convertItem.quantity}x {convertItem.unit}</strong></p>
            </div>

            {/* Direção da conversão - só mostra toggle se for Unidade (pode escolher destino) */}
            {convertItem.unit === "Unidade" ? (
              <>
                <div className="bp-entrada-field">
                  <label>Converter para qual unidade?</label>
                  <select value={convertTargetUnit} onChange={(e) => setConvertTargetUnit(e.target.value)}>
                    {Object.keys(unitEquivalences)
                      .filter(u => u !== "Unidade" && unitEquivalences[u] > 1)
                      .map((u) => (
                        <option key={u} value={u}>
                          {u} (1 {u} = {unitEquivalences[u]} un.)
                        </option>
                      ))}
                  </select>
                </div>

                <div className="bp-entrada-field">
                  <label>Quantos {convertTargetUnit}(s) deseja formar?</label>
                  <input
                    type="number"
                    min="1"
                    value={convertQuantity}
                    onChange={(e) => setConvertQuantity(e.target.value)}
                  />
                </div>

                {conversionPreview && (
                  <>
                    {conversionPreview.unitsNeeded > convertItem.quantity && (
                      <div className="bp-conversion-warning">
                        ⚠️ Unidades insuficientes! Necessário: {conversionPreview.unitsNeeded}, disponível: {convertItem.quantity}
                      </div>
                    )}
                    <div className="bp-conversion-preview">
                      <div className="bp-convert-arrow">
                        <span className="bp-convert-from">{conversionPreview.from}</span>
                        <FaExchangeAlt />
                        <span className="bp-convert-to">{conversionPreview.to}</span>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="bp-convert-factor-info">
                  Fator: 1 {convertItem.unit} = <strong>{unitEquivalences[convertItem.unit]}</strong> Unidades
                </div>

                <div className="bp-entrada-field">
                  <label>Quantos {convertItem.unit}(s) converter para Unidades?</label>
                  <input
                    type="number"
                    min="1"
                    max={convertItem.quantity}
                    value={convertQuantity}
                    onChange={(e) => setConvertQuantity(e.target.value)}
                  />
                </div>

                {conversionPreview && (
                  <div className="bp-conversion-preview">
                    <div className="bp-convert-arrow">
                      <span className="bp-convert-from">{conversionPreview.from}</span>
                      <FaExchangeAlt />
                      <span className="bp-convert-to">{conversionPreview.to}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="bp-modal-buttons">
              <button
                onClick={handleConvertSubmit}
                disabled={
                  isLoading || !convertQuantity ||
                  (convertDirection === "toUnit" && parseInt(convertQuantity) > convertItem.quantity) ||
                  (convertDirection === "fromUnit" && (!convertTargetUnit || (conversionPreview && conversionPreview.unitsNeeded > convertItem.quantity)))
                }
              >
                {isLoading ? <FaSpinner className="bp-loading" /> : "Converter"}
              </button>
              <button onClick={() => setShowConvertModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmação de exclusão com senha */}
      {confirmDelete.show && (
        <div className="bp-modal">
          <div className="bp-modal-content bp-modal-delete">
            <h3 className="bp-modal-title">⚠️ Confirmar Exclusão</h3>
            <p className="bp-delete-warning">Tem certeza que deseja excluir este item do estoque?</p>
            <p className="bp-delete-note">Esta ação é irreversível. Digite sua senha para confirmar.</p>
            <input
              className="bp-modal-input"
              type="password"
              placeholder="Digite sua senha..."
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmDeleteProduct()}
              autoFocus
            />
            <div className="bp-modal-buttons">
              <button
                onClick={confirmDeleteProduct}
                disabled={deleteLoading || !deletePassword}
                className="bp-btn-confirm-delete"
              >
                {deleteLoading ? <FaSpinner className="bp-loading" /> : "Excluir"}
              </button>
              <button onClick={() => { setConfirmDelete({ show: false, id: null }); setDeletePassword(""); }}>
                Cancelar
              </button>
            </div>
          </div>
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

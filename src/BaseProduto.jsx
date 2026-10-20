import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { FaSpinner, FaExchangeAlt, FaPlus, FaBoxOpen, FaLayerGroup, FaTrash, FaTimes, FaCheck, FaBell, FaPen, FaTint } from "react-icons/fa";
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
  const [fractionalUnits, setFractionalUnits] = useState([]); // unidades fracionais (ex.: Dose)
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState(null);

  // Modal de entrada de estoque
  const [showEntradaModal, setShowEntradaModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [entradaQuantity, setEntradaQuantity] = useState("");
  const [entradaUnit, setEntradaUnit] = useState("Unidade");
  const [entradaValue, setEntradaValue] = useState("");
  const [entradaCusto, setEntradaCusto] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [filteredCatalog, setFilteredCatalog] = useState([]);
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false);

  // Modal de conversão
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertItem, setConvertItem] = useState(null);
  const [convertQuantity, setConvertQuantity] = useState("1");
  const [convertDirection, setConvertDirection] = useState("toUnit"); // "toUnit" ou "fromUnit"
  const [convertTargetUnit, setConvertTargetUnit] = useState("");
  // Estado para conversão em porções customizadas
  const [doseTargetUnit, setDoseTargetUnit] = useState("Dose");
  const [doseYield, setDoseYield] = useState(""); // rendimento: qtd de porções por unidade
  const [doseSellValue, setDoseSellValue] = useState(""); // preço de venda da porção

  // Edição
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingProductData, setEditingProductData] = useState({});

  // Confirmação de exclusão
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ============ COMPOSIÇÃO DE PRODUTO ============
  const [showComposicaoModal, setShowComposicaoModal] = useState(false);
  const [composicaoItem, setComposicaoItem] = useState(null);
  const [composicoes, setComposicoes] = useState([]);
  const [isLoadingComp, setIsLoadingComp] = useState(false);
  const [showNovaCompForm, setShowNovaCompForm] = useState(false);
  const [novaComp, setNovaComp] = useState({ nome: '', descricao: '', obrigatorio: true, multiplo: false, maxOpcoes: 1, montagem: false, porcoesGratis: 2, valorAdicional: 2.5 });
  const [editMontagemId, setEditMontagemId] = useState(null); // composicaoId em edição de montagem
  const [montagemEdit, setMontagemEdit] = useState({ montagem: false, maxOpcoes: 4, porcoesGratis: 2, valorAdicional: 2.5 });
  const [novaOpcaoComp, setNovaOpcaoComp] = useState(null); // composicaoId com picker aberto
  const [novaOpcaoValorExtra, setNovaOpcaoValorExtra] = useState('0'); // valor adicional ao vincular item existente
  const [novaOpcaoExclusiva, setNovaOpcaoExclusiva] = useState(false);
  const [novaOpcaoBase, setNovaOpcaoBase] = useState(false);
  const [novaOpcaoConsumo, setNovaOpcaoConsumo] = useState('1');
  const [editOpcaoValorId, setEditOpcaoValorId] = useState(null); // opcaoId em edição do valor adicional
  const [editOpcaoValorValue, setEditOpcaoValorValue] = useState('0');

  // ============ VARIAÇÃO DE VENDA (COMBO) ============
  const [showComboModal, setShowComboModal] = useState(false);
  const [comboItem, setComboItem] = useState(null);
  const [comboAtivo, setComboAtivo] = useState(false);
  const [comboNome, setComboNome] = useState('');
  const [savingCombo, setSavingCombo] = useState(false);
  const [estoqueList, setEstoqueList] = useState([]);       // todos os itens do estoque
  const [opcaoPicker, setOpcaoPicker] = useState({ search: '' }); // filtro no picker
  const [savingOpcao, setSavingOpcao] = useState(false);

  // ============ ESTOQUE MÍNIMO ============
  const [minimoMap, setMinimoMap] = useState({}); // estoqueId → { id, quantidadeMinima }
  const [showMinimoModal, setShowMinimoModal] = useState(false);
  const [minimoItem, setMinimoItem] = useState(null);
  const [minimoValor, setMinimoValor] = useState("");
  const [savingMinimo, setSavingMinimo] = useState(false);

  // ============ FALTA NO ESTOQUE ============
  const [showFalta, setShowFalta] = useState(true);

  // Buscar dados ao carregar
  useEffect(() => {
    fetchEstoque();
    fetchCatalog();
    fetchCategories();
    fetchUnitEquivalences();
    fetchMinimoMap();
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
        setFractionalUnits(
          res.data
            .filter((eq) => eq.isFractional && eq.fractionalValue > 0)
            .map((eq) => eq.unitName)
        );
      })
      .catch((err) => {
        console.error("Erro ao buscar equivalências:", err);
        setUnitEquivalences({ "Unidade": 1, "Maço": 20, "Fardo": 12, "Pacote": 10 });
      });
  };

  const fetchMinimoMap = () => {
    axios.get(`${API_URL}/api/estoque-minimo`)
      .then(res => {
        const map = {};
        res.data.forEach(m => { map[m.estoqueId] = m; });
        setMinimoMap(map);
      })
      .catch(err => console.error("Erro ao buscar mínimos:", err));
  };

  const handleSaveMinimo = () => {
    if (!minimoItem || minimoValor === "") return;
    setSavingMinimo(true);
    const val = parseFloat(minimoValor);
    if (val <= 0) {
      // Remover mínimo
      axios.delete(`${API_URL}/api/estoque-minimo/${minimoItem.id}`)
        .then(() => { fetchMinimoMap(); setShowMinimoModal(false); })
        .catch(() => setMessage({ text: "Erro ao remover mínimo!", type: "error" }))
        .finally(() => setSavingMinimo(false));
      return;
    }
    axios.post(`${API_URL}/api/estoque-minimo`, { estoqueId: minimoItem.id, quantidadeMinima: val })
      .then(() => { fetchMinimoMap(); setShowMinimoModal(false); })
      .catch(() => setMessage({ text: "Erro ao salvar mínimo!", type: "error" }))
      .finally(() => setSavingMinimo(false));
  };

  // Controle por montante (ML): prévia e ativação/desativação por produto
  const fmtMl = (v) => Number((v || 0).toFixed(2)).toLocaleString("pt-BR");

  const handleMontante = async (item) => {
    try {
      const { data: prev } = await axios.get(`${API_URL}/api/estoque_prod/montante/preview/${item.productId}`);
      if (prev.ativo) {
        if (!window.confirm(`"${prev.nome}" usa controle por montante (${prev.montanteMl} ML).\n\nDesativar e voltar à conversão padrão entre unidades?`)) return;
        await axios.post(`${API_URL}/api/estoque_prod/montante/desativar`, { productId: item.productId });
        setMessage({ show: true, text: "Controle por montante desativado.", type: "success" });
      } else {
        if (prev.semMl.length > 0) {
          setMessage({ show: true, text: `Inclua o ML na unidade ou no nome de: ${prev.semMl.map((d) => d.unit).join(", ")}.`, type: "error" });
          return;
        }
        const linhas = prev.resultado.map((r) => `• ${r.unit} (${r.ml}ML): ${r.quantidadeAtual} → ${r.quantidadeNova}`).join("\n");
        if (!window.confirm(`Ativar controle por montante em "${prev.nome}"?\n\nMontante: ${prev.montanteMl} ML\n\n${linhas}`)) return;
        await axios.post(`${API_URL}/api/estoque_prod/montante/ativar`, { productId: item.productId });
        setMessage({ show: true, text: "Controle por montante ativado.", type: "success" });
      }
      fetchEstoque();
    } catch (err) {
      setMessage({ show: true, text: err.response?.data?.error || "Erro ao alterar controle por montante.", type: "error" });
    }
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
    // Ordena os itens de cada subcategoria alfabeticamente
    Object.values(hierarchy).forEach(parent => {
      Object.keys(parent.subcategories).forEach(subKey => {
        parent.subcategories[subKey].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
      });
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
    setEntradaValue("");
    setEntradaCusto("");
    setProductSearch("");
  };

  // Pré-preenche valor de venda/custo da entrada conforme a unidade selecionada
  // (usa unitPrices do produto quando existir; senão o valor padrão do produto). Editável.
  useEffect(() => {
    if (!selectedProductId) return;
    const prod = catalogProducts.find((p) => p.id === selectedProductId);
    if (!prod) return;
    // Resolve o preço da unidade selecionada: chave exata e, se não achar,
    // por nome normalizado (ignora caixa/espaços) para evitar divergências
    // entre a unidade da base de cadastro e a unidade escolhida na entrada.
    const up = prod.unitPrices && typeof prod.unitPrices === "object" ? prod.unitPrices : {};
    let cfg = up[entradaUnit];
    if (!cfg && entradaUnit) {
      const alvo = String(entradaUnit).trim().toLowerCase();
      const chave = Object.keys(up).find((k) => String(k).trim().toLowerCase() === alvo);
      if (chave) cfg = up[chave];
    }
    setEntradaValue(cfg && cfg.value != null ? String(cfg.value) : (prod.value != null ? String(prod.value) : ""));
    setEntradaCusto(cfg && cfg.cost != null ? String(cfg.cost) : (prod.valuecusto != null ? String(prod.valuecusto) : ""));
  }, [selectedProductId, entradaUnit, catalogProducts]);

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
      unit: entradaUnit,
      value: entradaValue === "" ? undefined : parseFloat(entradaValue),
      valuecusto: entradaCusto === "" ? undefined : parseFloat(entradaCusto)
    })
      .then(() => {
        setMessage({ show: true, text: "Entrada registrada com sucesso!", type: "success" });
        setShowEntradaModal(false);
        fetchEstoque();
        fetchMinimoMap();
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
  // Retorna quantas unidades globais uma unidade representa (não cadastradas = 1)
  const eqVal = (unitName) => unitEquivalences[unitName] || 1;

  // Resolve a unidade base (unitária = 1) de um item de estoque.
  // Usa product.baseUnit se definido; senão deduz a menor unidade cadastrada do produto.
  const getBaseUnit = (item) => {
    if (!item) return "Unidade";
    if (item.product?.baseUnit) return item.product.baseUnit;
    const group = estoqueItems.filter(e => e.productId === item.productId);
    const source = group.length ? group : [item];
    let best = null, bestVal = Infinity;
    source.forEach(e => {
      const val = eqVal(e.unit);
      if (val < bestVal) { bestVal = val; best = e.unit; }
    });
    return best || "Unidade";
  };

  const openConvertModal = (item) => {
    setConvertItem(item);
    setConvertQuantity("1");
    const baseUnit = getBaseUnit(item);
    const baseVal = eqVal(baseUnit);
    const isPorcao = item.unit !== baseUnit && eqVal(item.unit) <= baseVal;
    if (item.unit === baseUnit) {
      setConvertDirection("fromUnit");
      // Selecionar a primeira unidade empacotada disponível (maior que a base)
      const packedUnits = Object.keys(unitEquivalences).filter(u => u !== baseUnit && eqVal(u) > baseVal);
      setConvertTargetUnit(packedUnits.length > 0 ? packedUnits[0] : "");
    } else if (isPorcao) {
      // Unidade do tipo Porção/Dose: abre direto na aba de conversão por rendimento
      setConvertDirection("dose");
      setConvertTargetUnit("");
    } else {
      setConvertDirection("toUnit");
      setConvertTargetUnit("");
    }
    setShowConvertModal(true);
    setDoseTargetUnit("Dose");
    setDoseYield("");
    setDoseSellValue("");
  };

  const getConversionPreview = () => {
    if (!convertItem || !convertQuantity) return null;
    const qty = parseInt(convertQuantity) || 0;
    if (qty <= 0) return null;

    const baseUnit = getBaseUnit(convertItem);
    const baseVal = eqVal(baseUnit);

    if (convertDirection === "toUnit") {
      // Empacotado → unidade base
      const factor = eqVal(convertItem.unit) / baseVal;
      if (!(factor > 1)) return null;
      return {
        from: `${qty}x ${convertItem.unit}`,
        to: `${qty * factor}x ${baseUnit}`,
        factor: factor
      };
    } else {
      // Unidade base → Empacotado
      if (!convertTargetUnit) return null;
      const factor = eqVal(convertTargetUnit) / baseVal;
      if (!(factor > 1)) return null;
      const unitsNeeded = qty * factor;
      return {
        from: `${unitsNeeded}x ${baseUnit}`,
        to: `${qty}x ${convertTargetUnit}`,
        factor: factor,
        unitsNeeded: unitsNeeded
      };
    }
  };

  const handleConvertSubmit = () => {
    if (!convertItem || !convertQuantity) return;
    setIsLoading(true);

    // Conversão em porções customizadas (ex: Garrafa → Dose)
    if (convertDirection === "dose") {
      if (!doseTargetUnit.trim() || !doseYield || parseFloat(doseYield) <= 0) {
        setMessage({ show: true, text: "Preencha a unidade de destino e o rendimento!", type: "error" });
        setTimeout(() => setMessage(null), 4000);
        setIsLoading(false);
        return;
      }
      axios.post(`${API_URL}/api/estoque_prod/converter-dose`, {
        estoqueId: convertItem.id,
        quantityToConvert: parseInt(convertQuantity),
        targetUnit: doseTargetUnit.trim(),
        yieldPerUnit: parseFloat(doseYield),
        targetValue: doseSellValue ? parseFloat(doseSellValue) : null,
        targetValueCusto: null
      })
        .then((res) => {
          const { origin, destination } = res.data;
          setMessage({ show: true, text: `Convertido! ${origin.removed}x ${origin.unit} → ${destination.added}x ${destination.unit}`, type: "success" });
          setShowConvertModal(false);
          fetchEstoque();
          setTimeout(() => setMessage(null), 4000);
        })
        .catch((err) => {
          setMessage({ show: true, text: err.response?.data?.error || "Erro ao converter!", type: "error" });
          setTimeout(() => setMessage(null), 5000);
        })
        .finally(() => setIsLoading(false));
      return;
    }

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
            text: `Convertido! ${origin.removed}x ${origin.unit} → ${destination.added}x ${destination.unit}`,
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
            text: `Convertido! ${origin.removed}x ${origin.unit} → ${destination.added}x ${destination.unit}`,
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
      contabiliza: product.contabiliza !== false, // default true
    });
  };

  const handleSaveProduct = () => {
    if (!editingProduct) return;
    const { name, quantity, unit, value, valuecusto, categoryId, contabiliza } = editingProductData;
    const finalCategoryId = categoryId ? parseInt(categoryId) : null;
    axios
      .put(`${API_URL}/api/estoque_prod/${editingProduct}`, {
        name, quantity, unit, value, valuecusto, categoryId: finalCategoryId,
        contabiliza: contabiliza !== false
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
        Categoria: item.category?.name || "Sem categoria",
        Valor: formatCurrency(item.value),
        Custo: formatCurrency(item.valuecusto),
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estoque");
    XLSX.writeFile(workbook, "estoque-produtos.xlsx");
  };

  // ============ COMPOSIÇÃO ============
  const openComposicaoModal = async (item) => {
    setComposicaoItem(item);
    setShowComposicaoModal(true);
    setShowNovaCompForm(false);
    setNovaOpcaoComp(null);
    setIsLoadingComp(true);
    try {
      const [compRes, estoqRes] = await Promise.all([
        axios.get(`${API_URL}/api/composicoes/${item.id}`),
        axios.get(`${API_URL}/api/estoque_prod`)
      ]);
      setComposicoes(compRes.data);
      setEstoqueList(estoqRes.data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) { console.error('Erro ao buscar composições:', e); }
    setIsLoadingComp(false);
  };

  const refreshComposicoes = async () => {
    if (!composicaoItem) return;
    const res = await axios.get(`${API_URL}/api/composicoes/${composicaoItem.id}`);
    setComposicoes(res.data);
  };

  const handleAddComposicao = async () => {
    if (!novaComp.nome.trim()) return;
    try {
      const montagem = novaComp.montagem;
      await axios.post(`${API_URL}/api/composicoes`, {
        estoqueId: composicaoItem.id,
        nome: novaComp.nome.trim(),
        descricao: novaComp.descricao.trim() || null,
        obrigatorio: montagem ? true : novaComp.obrigatorio,
        multiplo: montagem ? true : novaComp.multiplo,
        minOpcoes: 1,
        maxOpcoes: montagem ? (parseInt(novaComp.maxOpcoes) || 4) : novaComp.maxOpcoes,
        porcoesGratis: montagem ? (parseInt(novaComp.porcoesGratis) || 0) : 0,
        valorAdicional: montagem ? (parseFloat(novaComp.valorAdicional) || 0) : 0,
        ordem: composicoes.length
      });
      setNovaComp({ nome: '', descricao: '', obrigatorio: true, multiplo: false, maxOpcoes: 1, montagem: false, porcoesGratis: 2, valorAdicional: 2.5 });
      setShowNovaCompForm(false);
      await refreshComposicoes();
    } catch (e) {
      setMessage({ show: true, text: 'Erro ao criar componente!', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleDeleteComposicao = async (id) => {
    if (!window.confirm('Excluir este componente e todas as suas opções?')) return;
    try {
      await axios.delete(`${API_URL}/api/composicoes/${id}`);
      await refreshComposicoes();
    } catch (e) {
      setMessage({ show: true, text: 'Erro ao excluir componente!', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const abrirEdicaoMontagem = (comp) => {
    const isMont = comp.multiplo && (comp.valorAdicional || 0) > 0;
    setEditMontagemId(comp.id);
    setMontagemEdit({
      montagem: isMont,
      maxOpcoes: comp.maxOpcoes && comp.maxOpcoes > 1 ? comp.maxOpcoes : 4,
      porcoesGratis: comp.porcoesGratis || 2,
      valorAdicional: comp.valorAdicional || 2.5,
    });
  };

  const handleSalvarMontagem = async (comp) => {
    try {
      const m = montagemEdit;
      await axios.put(`${API_URL}/api/composicoes/${comp.id}`, {
        nome: comp.nome,
        descricao: comp.descricao || null,
        obrigatorio: m.montagem ? true : comp.obrigatorio,
        multiplo: m.montagem ? true : comp.multiplo,
        minOpcoes: 1,
        maxOpcoes: m.montagem ? (parseInt(m.maxOpcoes) || 4) : comp.maxOpcoes,
        ordem: comp.ordem || 0,
        porcoesGratis: m.montagem ? (parseInt(m.porcoesGratis) || 0) : 0,
        valorAdicional: m.montagem ? (parseFloat(String(m.valorAdicional).replace(',', '.')) || 0) : 0,
      });
      setEditMontagemId(null);
      await refreshComposicoes();
    } catch (e) {
      setMessage({ show: true, text: 'Erro ao salvar montagem!', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Adiciona opção selecionando um item de estoque existente.
  // Se o produto for adicionado na unidade base mas possuir um registro de
  // estoque em unidade fracional (ex.: Dose), a opção é vinculada à unidade
  // fracional; o desmembramento do estoque ocorre sob demanda na venda.
  const resolveFractionalTarget = (item) => {
    // Em variações de venda (combo) a unidade escolhida é a que vale:
    // vincular "Garrafa" deve manter Garrafa, e não virar a Dose irmã.
    if (composicaoItem?.isCombo) return item;
    const isFractional = (u) => fractionalUnits.includes(u);
    if (isFractional(item.unit)) return item; // já é fracional
    const sibling = estoqueList.find(
      (e) => e.productId === item.productId && e.id !== item.id && isFractional(e.unit)
    );
    return sibling || item;
  };

  const handleAddOpcaoFromEstoque = async (composicaoId, estoqueItem) => {
    setSavingOpcao(true);
    try {
      const target = resolveFractionalTarget(estoqueItem);
      const valorExtra = parseFloat(String(novaOpcaoValorExtra).replace(',', '.')) || 0;
      await axios.post(`${API_URL}/api/composicoes/${composicaoId}/opcoes`, {
        nome: target.name,
        valorExtra,
        estoqueId: target.id,
        exclusivo: novaOpcaoExclusiva,
        base: novaOpcaoBase,
        consomeQtd: parseInt(novaOpcaoConsumo, 10) || 1
      });
      const estoqRes = await axios.get(`${API_URL}/api/estoque_prod`);
      setEstoqueList(estoqRes.data.sort((a, b) => a.name.localeCompare(b.name)));
      setNovaOpcaoValorExtra('0');
      setNovaOpcaoExclusiva(false);
      setNovaOpcaoBase(false);
      setNovaOpcaoConsumo('1');
      await refreshComposicoes();
      if (target.id !== estoqueItem.id) {
        setMessage({
          show: true,
          text: `"${estoqueItem.name}" vinculado na unidade fracional "${target.unit}". O desmembramento do estoque será feito automaticamente na venda.`,
          type: 'success'
        });
        setTimeout(() => setMessage(null), 5000);
      }
    } catch (e) {
      setMessage({ show: true, text: 'Erro ao adicionar opção!', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
    setSavingOpcao(false);
  };

  // Fecha o picker de opções
  const closePicker = () => {
    setNovaOpcaoComp(null);
    setOpcaoPicker({ search: '' });
    setNovaOpcaoValorExtra('0');
  };

  const handleDeleteOpcao = async (opcaoId) => {
    try {
      await axios.delete(`${API_URL}/api/composicoes/opcoes/${opcaoId}`);
      if (editOpcaoValorId === opcaoId) setEditOpcaoValorId(null);
      await refreshComposicoes();
    } catch (e) {
      setMessage({ show: true, text: 'Erro ao excluir opção!', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleToggleOpcao = async (opcaoId, disponivel) => {
    try {
      await axios.put(`${API_URL}/api/composicoes/opcoes/${opcaoId}`, { disponivel: !disponivel });
      await refreshComposicoes();
    } catch (e) {
      setMessage({ show: true, text: 'Erro ao atualizar opção!', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Regra de cobrança por componente específico (valorExtra da opção)
  const handleEditOpcaoValor = (opcao) => {
    setEditOpcaoValorId(opcao.id);
    setEditOpcaoValorValue(opcao.valorExtra != null ? String(opcao.valorExtra) : '0');
  };

  // ============ VARIAÇÃO DE VENDA (COMBO) ============
  const openComboModal = (item) => {
    setComboItem(item);
    setComboAtivo(!!item.isCombo);
    setComboNome(item.comboNome || item.unit || 'Combo');
    setShowComboModal(true);
  };

  const handleSalvarCombo = async () => {
    if (!comboItem) return;
    setSavingCombo(true);
    try {
      await axios.patch(`${API_URL}/api/estoque_prod/${comboItem.id}/combo`, {
        isCombo: comboAtivo,
        comboNome: comboAtivo ? (comboNome.trim() || 'Combo') : null
      });
      setShowComboModal(false);
      fetchEstoque();
      setMessage({
        show: true,
        text: comboAtivo
          ? 'Variação de venda ativada. O disponível passa a ser calculado pelos componentes.'
          : 'Variação de venda desativada.',
        type: 'success'
      });
      setTimeout(() => setMessage(null), 4000);
    } catch (e) {
      setMessage({ show: true, text: e.response?.data?.error || 'Erro ao salvar variação de venda!', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
    setSavingCombo(false);
  };

  // Alterna as regras de quantidade de um grupo de composição
  const handleToggleRegraGrupo = async (comp, campo) => {
    try {
      await axios.put(`${API_URL}/api/composicoes/${comp.id}`, {
        nome: comp.nome,
        descricao: comp.descricao || '',
        obrigatorio: comp.obrigatorio,
        multiplo: campo === 'permiteQuantidade' ? true : comp.multiplo,
        minOpcoes: comp.minOpcoes || 1,
        maxOpcoes: comp.maxOpcoes || 1,
        porcoesGratis: comp.porcoesGratis || 0,
        valorAdicional: comp.valorAdicional || 0,
        ordem: comp.ordem || 0,
        permiteQuantidade: campo === 'permiteQuantidade' ? !comp.permiteQuantidade : comp.permiteQuantidade,
        exigeTotalExato: campo === 'exigeTotalExato' ? !comp.exigeTotalExato : comp.exigeTotalExato
      });
      await refreshComposicoes();
    } catch (e) {
      setMessage({ show: true, text: 'Erro ao salvar regra do grupo!', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // Exclusividade / consumo de quota de uma opção (ex.: Vibe 2L fecha o grupo)
  const handleSalvarRegraOpcao = async (opcaoId, patch) => {
    try {
      await axios.put(`${API_URL}/api/composicoes/opcoes/${opcaoId}`, patch);
      await refreshComposicoes();
    } catch (e) {
      setMessage({ show: true, text: 'Erro ao salvar regra da opção!', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleSalvarOpcaoValor = async (opcao) => {
    try {
      const valorExtra = parseFloat(String(editOpcaoValorValue).replace(',', '.')) || 0;
      await axios.put(`${API_URL}/api/composicoes/opcoes/${opcao.id}`, { valorExtra });
      setEditOpcaoValorId(null);
      await refreshComposicoes();
    } catch (e) {
      setMessage({ show: true, text: 'Erro ao salvar valor adicional!', type: 'error' });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const conversionPreview = getConversionPreview();

  // Unidade base do item em conversão (unitária = 1)
  const convertBaseUnit = convertItem ? getBaseUnit(convertItem) : "Unidade";
  const convertBaseVal = eqVal(convertBaseUnit);

  // Unidades atreladas ao produto selecionado na entrada (espelha o mobile):
  // unidade base do produto + unidades já cadastradas no estoque desse produto + unidades fracionais.
  // Só mostra as unidades que têm relação com o produto (nunca todas as unidades do sistema).
  const entradaProduct = catalogProducts.find((p) => p.id === selectedProductId);
  const entradaAvailableUnits = (() => {
    if (!entradaProduct) return ["Unidade"];
    const unidades = [];
    if (entradaProduct.unit) unidades.push(entradaProduct.unit);
    (entradaProduct.estoqueItems || []).forEach((item) => {
      if (item?.unit) unidades.push(item.unit);
    });
    // Reforço: unidades já existentes no estoque para este produto (caso o catálogo não traga estoqueItems)
    estoqueItems.forEach((e) => {
      if (e.productId === selectedProductId && e.unit) unidades.push(e.unit);
    });
    // Unidades comercializáveis configuradas para ESTE produto (base de cadastro).
    // Só as unidades atreladas ao produto — não todas as unidades/fracionais do sistema.
    if (entradaProduct.unitPrices && typeof entradaProduct.unitPrices === "object") {
      Object.keys(entradaProduct.unitPrices).forEach((u) => {
        if (u && !unidades.includes(u)) unidades.push(u);
      });
    }
    const result = [...new Set(unidades.filter(Boolean))];
    return result.length ? result : ["Unidade"];
  })();

  // Separa itens zerados (falta no estoque) dos itens com saldo disponível.
  // Um item zerado NÃO está em falta se houver unidade de medida maior do mesmo
  // produto com estoque disponível (conversão automática na venda). Unidades
  // fracionais só são abastecidas pela unidade-pai não fracional.
  const hasConversionSibling = (item) => {
    const pid = item.productId;
    if (!pid) return false;
    if (item.controlaMontante) return false; // montante já cobre todas as unidades do produto
    const currentIsFractional = fractionalUnits.includes(item.unit);
    const currentVal = eqVal(item.unit);
    return estoqueItems.some((s) => {
      if (s.productId !== pid || s.id === item.id) return false;
      if ((s.quantity ?? 0) < 1) return false;
      if (fractionalUnits.includes(s.unit)) return false;
      if (currentIsFractional) return true; // unidade-pai desmembra em frações
      return eqVal(s.unit) > currentVal; // irmã com unidade maior
    });
  };

  // Variação de venda (combo) não tem estoque próprio — o disponível é
  // calculado pelos componentes. Portanto nunca entra em "Falta no Estoque".
  const zeroedItems = filteredItems
    .filter((item) => !item.isCombo && (item.quantity ?? 0) <= 0 && !hasConversionSibling(item))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const activeItems = filteredItems.filter(
    (item) => item.isCombo || (item.quantity ?? 0) > 0 || hasConversionSibling(item)
  );

  return (
    <div className="bp-container">
      <h2 className="bp-title">Estoque</h2>

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

      {/* ============ SEÇÃO FALTA NO ESTOQUE ============ */}
      {zeroedItems.length > 0 && (
        <div className="bp-falta-section">
          <div className="bp-falta-header" onClick={() => setShowFalta((s) => !s)}>
            <div className="bp-falta-title">
              <FaBell /> Falta no Estoque
              <span className="bp-falta-count">{zeroedItems.length}</span>
            </div>
            <button className="bp-expand-btn" onClick={(e) => { e.stopPropagation(); setShowFalta((s) => !s); }}>
              {showFalta ? "Ocultar" : "Expandir"}
            </button>
          </div>

          {showFalta && (
            <ul className="bp-falta-list">
              {zeroedItems.map((item) => (
                <li className="bp-falta-item" key={item.id}>
                  <span className="bp-falta-item-name">
                    {item.name}
                    {item.controlaMontante && (
                      <span className="bp-badge-montante">Montante: {fmtMl(item.montanteMl)} ML</span>
                    )}
                  </span>
                  <span className="bp-falta-item-cat">
                    {item.category?.parent
                      ? `${item.category.parent.name} > ${item.category.name}`
                      : item.category?.name || "—"}
                  </span>
                  <span className="bp-falta-item-qtd">0 {item.unit}</span>
                  <div className="bp-falta-item-actions">
                    <button className="bp-btn-update" onClick={() => handleUpdateProduct(item)}>Editar</button>
                    <button className="bp-btn-delete" onClick={() => handleDeleteProduct(item.id)}>Excluir</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Header da tabela */}
      <div className="bp-header">
        <div className="bp-header-container">
          <div className="bp-header-col">PRODUTO</div>
          <div className="bp-header-col">QTD</div>
          <div className="bp-header-col">UNIDADE</div>
          <div className="bp-header-col">CATEGORIA</div>
          <div className="bp-header-col">VALOR UN</div>
          <div className="bp-header-col">CUSTO</div>
        </div>
        <div className="bp-header-actions">AÇÕES</div>
      </div>

      {/* Lista de produtos agrupados */}
      <ul className="bp-list">
        {Object.entries(groupByCategory(activeItems))
          .sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
          .map(([parentName, parentData]) => (
          <li key={parentName} className="bp-group">
            <div className="bp-group-header parent-category-header" onClick={() => toggleGroup(parentName)}>
              <div className="bp-group-title"><span>📁 {parentName}</span></div>
              <div className="bp-group-info">
                <span style={{ textShadow: "none" }}  className="bp-group-count">{parentData.totalCount} itens</span>
                <button className="bp-expand-btn" onClick={(e) => { e.stopPropagation(); toggleGroup(parentName); }}>
                  {expandedGroups[parentName] ? "Ocultar" : "Expandir"}
                </button>
              </div>
            </div>

            {expandedGroups[parentName] && (
              <ul className="bp-subcategory-list">
                {Object.entries(parentData.subcategories)
                  .sort(([a], [b]) => (a === '_direct' ? '' : a).localeCompare(b === '_direct' ? '' : b, "pt-BR"))
                  .map(([subName, subItems]) => (
                  <li key={`${parentName}-${subName}`} className="bp-subgroup">
                    <div className="bp-group-header subcategory-header" onClick={() => toggleGroup(`${parentName}-${subName}`)}>
                      <div className="bp-group-title">
                        <span>{subName === '_direct' ? '📄 Produtos diretos' : `📄 ${subName}`}</span>
                      </div>
                      <div className="bp-group-info">
                        <span  style={{ textShadow: "none" }} className="bp-group-count">{subItems.length} itens</span>
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
                                <div className="bp-edit-field bp-edit-field--contabiliza">
                                  <label className="bp-edit-label">CONTABILIZA?</label>
                                  <button
                                    className={`bp-contabiliza-toggle ${editingProductData.contabiliza !== false ? 'bp-contabiliza-toggle--sim' : 'bp-contabiliza-toggle--nao'}`}
                                    onClick={() => setEditingProductData({ ...editingProductData, contabiliza: !editingProductData.contabiliza })}
                                    type="button"
                                  >
                                    {editingProductData.contabiliza !== false ? 'S' : 'N'}
                                  </button>
                                  <span className="bp-contabiliza-hint">
                                    {editingProductData.contabiliza !== false ? 'Baixa estoque automaticamente' : 'Descartável — segue follow-up semanal'}
                                  </span>
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
                                    <span className="bp-info-value">
                                      {item.name}
                                      {item.contabiliza === false && (
                                        <span className="bp-badge-descartavel" title="Descartável — não baixa estoque automaticamente">N</span>
                                      )}
                                      {item.controlaMontante && (
                                        <span className="bp-badge-montante" title="Montante em ML do produto (garrafa + doses)">Montante: {fmtMl(item.montanteMl)} ML</span>
                                      )}
                                      {(item.product?.pdvHiddenUnits || []).includes(item.unit) && (
                                        <span className="bp-badge-oculto-pdv" title="Oculto no PDV — configure em Produtos">PDV</span>
                                      )}
                                    </span>
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
                                  {(() => {
                                    const baseU = getBaseUnit(item);
                                    const baseV = eqVal(baseU);
                                    const isBase = item.unit === baseU;

                                  })()}
                                  <button
                                    className={`bp-btn-minimo ${minimoMap[item.id] ? "bp-btn-minimo--set" : ""}`}
                                    onClick={() => { setMinimoItem(item); setMinimoValor(minimoMap[item.id]?.quantidadeMinima ?? ""); setShowMinimoModal(true); }}
                                    title={minimoMap[item.id] ? `Mínimo: ${minimoMap[item.id].quantidadeMinima}` : "Definir estoque mínimo"}
                                  >
                                    <FaBell />
                                  </button>
                                  <button
                                    className={`bp-btn-combo ${item.isCombo ? 'bp-btn-combo--ativo' : ''}`}
                                    onClick={() => openComboModal(item)}
                                    title={item.isCombo ? `Variação de venda: ${item.comboNome || 'Combo'}` : 'Definir como variação de venda (combo)'}
                                  >
                                    <FaBoxOpen />
                                  </button>
                                  <button
                                    className={`bp-btn-composicao ${item.composicoes?.length ? 'bp-btn-composicao--ativo' : ''}`}
                                    onClick={() => openComposicaoModal(item)}
                                    title={item.composicoes?.length ? `Gerenciar composição / variantes (${item.composicoes.length})` : "Gerenciar composição / variantes"}
                                  >
                                    <FaLayerGroup /> {item.composicoes?.length > 0 && item.composicoes.length}
                                  </button>
                                  {!item.isCombo && (
                                    <button
                                      className={`bp-btn-minimo ${item.controlaMontante ? "bp-btn-minimo--set" : ""}`}
                                      onClick={() => handleMontante(item)}
                                      title={item.controlaMontante ? `Controle por montante ativo (${item.montanteMl} ML)` : "Controlar por montante (ML)"}
                                    >
                                      <FaTint />
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
                  {entradaAvailableUnits.map((u) => (
                    <option key={u} value={u}>
                      {u} {unitEquivalences[u] > 1 ? `(${unitEquivalences[u]} un.)` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bp-entrada-row">
              <div className="bp-entrada-field">
                <label>Valor de venda (R$):</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entradaValue}
                  onChange={(e) => setEntradaValue(e.target.value)}
                  placeholder="Valor de venda"
                />
              </div>
              <div className="bp-entrada-field">
                <label>Valor de custo (R$):</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entradaCusto}
                  onChange={(e) => setEntradaCusto(e.target.value)}
                  placeholder="Valor de custo"
                />
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

            {/* Direção da conversão - só mostra toggle se estiver na unidade base (pode escolher destino) */}
            {convertItem.unit === convertBaseUnit ? (
              <>
                <div className="bp-entrada-field">
                  <label>Converter para qual unidade?</label>
                  <select value={convertTargetUnit} onChange={(e) => setConvertTargetUnit(e.target.value)}>
                    {Object.keys(unitEquivalences)
                      .filter(u => u !== convertBaseUnit && eqVal(u) > convertBaseVal)
                      .map((u) => (
                        <option key={u} value={u}>
                          {u} (1 {u} = {eqVal(u) / convertBaseVal} {convertBaseUnit})
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
                {/* Tabs de modo de conversão */}
                <div className="bp-convert-tabs">
                  <button
                    className={`bp-convert-tab ${convertDirection === "toUnit" ? "bp-convert-tab--active" : ""}`}
                    onClick={() => setConvertDirection("toUnit")}
                  >
                    → {convertBaseUnit}
                  </button>
                  <button
                    className={`bp-convert-tab ${convertDirection === "dose" ? "bp-convert-tab--active" : ""}`}
                    onClick={() => setConvertDirection("dose")}
                  >
                    → Porções / Doses
                  </button>
                </div>

                {convertDirection === "toUnit" ? (
                  <>
                    {eqVal(convertItem.unit) > convertBaseVal ? (
                      <>
                        <div className="bp-convert-factor-info">
                          Fator: 1 {convertItem.unit} = <strong>{eqVal(convertItem.unit) / convertBaseVal}</strong> {convertBaseUnit}
                        </div>
                        <div className="bp-entrada-field">
                          <label>Quantos {convertItem.unit}(s) converter para {convertBaseUnit}?</label>
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
                    ) : (
                      <div className="bp-convert-no-equiv">
                        ⚠️ Nenhuma equivalência cadastrada para "{convertItem.unit}". Use o modo <strong>Porções / Doses</strong> para converter com rendimento personalizado, ou cadastre a equivalência na Lista de Compras.
                      </div>
                    )}
                  </>
                ) : (
                  /* Modo dose: conversão customizada com rendimento */
                  <>
                    <div className="bp-dose-info-box">
                      <span>💡 Use este modo para converter em porções onde o rendimento é diferente de um múltiplo fixo — ex: 1 Garrafa (1000ml) → 9 Doses de 100ml (margem de perda inclusa).</span>
                    </div>
                    <div className="bp-dose-fields">
                      <div className="bp-entrada-field">
                        <label>Quantos {convertItem.unit}(s) converter?</label>
                        <input
                          type="number" min="1" max={convertItem.quantity}
                          value={convertQuantity}
                          onChange={(e) => setConvertQuantity(e.target.value)}
                        />
                      </div>
                      <div className="bp-entrada-field">
                        <label>Nome da unidade de destino (ex: Dose, Taça, Copo)</label>
                        <input
                          type="text"
                          value={doseTargetUnit}
                          onChange={(e) => setDoseTargetUnit(e.target.value)}
                          placeholder="Dose"
                        />
                      </div>
                      <div className="bp-entrada-field">
                        <label>Rendimento por {convertItem.unit} (ex: 9 doses por garrafa)</label>
                        <input
                          type="number" min="0.1" step="0.1"
                          value={doseYield}
                          onChange={(e) => setDoseYield(e.target.value)}
                          placeholder="Ex: 9"
                        />
                      </div>
                      <div className="bp-entrada-field">
                        <label>Valor de venda por {doseTargetUnit || "porção"} (R$) — opcional</label>
                        <input
                          type="number" min="0" step="0.01"
                          value={doseSellValue}
                          onChange={(e) => setDoseSellValue(e.target.value)}
                          placeholder={doseYield ? `Sugerido: ${formatCurrency((convertItem.value || 0) / (parseFloat(doseYield) || 1))}` : "Ex: 12,00"}
                        />
                      </div>
                    </div>
                    {convertQuantity && doseYield && parseFloat(doseYield) > 0 && (
                      <div className="bp-conversion-preview">
                        <div className="bp-convert-arrow">
                          <span className="bp-convert-from">{parseInt(convertQuantity) || 0}x {convertItem.unit}</span>
                          <FaExchangeAlt />
                          <span className="bp-convert-to">{Math.floor((parseInt(convertQuantity) || 0) * parseFloat(doseYield))}x {doseTargetUnit || "Dose"}</span>
                        </div>
                        {parseInt(convertQuantity) > convertItem.quantity && (
                          <div className="bp-conversion-warning">⚠️ Quantidade maior que o estoque disponível ({convertItem.quantity})!</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <div className="bp-modal-buttons">
              <button
                onClick={handleConvertSubmit}
                disabled={
                  isLoading || !convertQuantity || parseInt(convertQuantity) > convertItem.quantity ||
                  (convertDirection === "fromUnit" && (!convertTargetUnit || (conversionPreview && conversionPreview.unitsNeeded > convertItem.quantity))) ||
                  (convertDirection === "dose" && (!doseTargetUnit.trim() || !doseYield || parseFloat(doseYield) <= 0))
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

      {/* ============ MODAL COMPOSIÇÃO ============ */}
      {showComboModal && comboItem && (
        <div className="bp-modal">
          <div className="bp-modal-content">
            <h3 className="bp-modal-title"><FaBoxOpen /> Variação de Venda</h3>
            <p className="bp-combo-sub">{comboItem.name} — {comboItem.unit}</p>

            <label className="bp-combo-check">
              <input type="checkbox" checked={comboAtivo} onChange={e => setComboAtivo(e.target.checked)} />
              &nbsp;Esta unidade é uma variação de venda (conjunto de produtos)
            </label>

            <p className="bp-combo-help">
              Ative quando a "unidade" na verdade for um conjunto vendido junto (ex.: Combo).
              O estoque deixa de ser próprio e passa a ser calculado pelos componentes:
              a menor razão entre o estoque de cada grupo obrigatório e a quota exigida por combo.
            </p>

            {comboAtivo && (
              <>
                <label className="bp-combo-label">Nome da variação
                  <input type="text" value={comboNome} onChange={e => setComboNome(e.target.value)} placeholder="Ex.: Combo" />
                </label>
                <p className="bp-combo-help">
                  Configure os grupos e as regras no botão de composição: <strong>Qtd por opção</strong> (3x1, 2x2, 4),
                  <strong> Exigir N exatos</strong> e opções <strong>exclusivas</strong> (ex.: 2L bloqueia as latas).
                </p>
              </>
            )}

            <div className="modal-buttons">
              <button onClick={handleSalvarCombo} disabled={savingCombo}>
                {savingCombo ? <FaSpinner className="bp-loading" /> : <FaCheck />} Salvar
              </button>
              <button onClick={() => setShowComboModal(false)}><FaTimes /> Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showComposicaoModal && composicaoItem && (
        <div className="bp-modal">
          <div className="bp-modal-content bp-modal-composicao">
            <div className="bp-comp-header">
              <h3 className="bp-modal-title"><FaLayerGroup /> Composição: {composicaoItem.name}</h3>
              <button className="bp-comp-close" onClick={() => setShowComposicaoModal(false)}><FaTimes /></button>
            </div>
            {isLoadingComp ? (
              <div className="bp-comp-loading"><FaSpinner className="bp-loading" /> Carregando...</div>
            ) : (
              <>
                {composicoes.map(comp => (
                  <div key={comp.id} className="bp-comp-item">
                    <div className="bp-comp-item-header">
                      <div className="bp-comp-item-info">
                        <strong>{comp.nome}</strong>
                        {comp.descricao && <span className="bp-comp-descricao">{comp.descricao}</span>}
                        <div className="bp-comp-tags">
                          {comp.obrigatorio && <span className="bp-comp-tag bp-comp-tag--obrig">Obrigatório</span>}
                          {comp.multiplo && (comp.valorAdicional > 0
                            ? <span className="bp-comp-tag bp-comp-tag--multi">Montagem • até {comp.maxOpcoes} • {comp.porcoesGratis} grátis • +R$ {Number(comp.valorAdicional).toFixed(2)}</span>
                            : <span className="bp-comp-tag bp-comp-tag--multi">Múltipla (até {comp.maxOpcoes})</span>)}
                          <button
                            className={`bp-comp-tag bp-comp-tag--regra ${comp.permiteQuantidade ? 'bp-comp-tag--regra-on' : ''}`}
                            onClick={() => handleToggleRegraGrupo(comp, 'permiteQuantidade')}
                            title="Permite escolher a quantidade de cada opção no PDV (ex.: 2x Coco + 2x Maracujá)"
                          >
                            Qtd por opção
                          </button>
                          <button
                            className={`bp-comp-tag bp-comp-tag--regra ${comp.exigeTotalExato ? 'bp-comp-tag--regra-on' : ''}`}
                            onClick={() => handleToggleRegraGrupo(comp, 'exigeTotalExato')}
                            title={`Exige fechar exatamente ${comp.maxOpcoes} itens`}
                          >
                            Exigir {comp.maxOpcoes} exatos
                          </button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="bp-comp-btn-delete" onClick={() => editMontagemId === comp.id ? setEditMontagemId(null) : abrirEdicaoMontagem(comp)} title="Configurar montagem"><FaLayerGroup /></button>
                        <button className="bp-comp-btn-delete" onClick={() => handleDeleteComposicao(comp.id)} title="Excluir componente"><FaTrash /></button>
                      </div>
                    </div>
                    {editMontagemId === comp.id && (
                      <div className="bp-comp-nova-form" style={{ marginTop: 8 }}>
                        <h4>Montagem (vários sabores)</h4>
                        <div className="bp-comp-nova-checks">
                          <label><input type="checkbox" checked={montagemEdit.montagem} onChange={e => setMontagemEdit(prev => ({ ...prev, montagem: e.target.checked }))} /> Ativar montagem</label>
                        </div>
                        {montagemEdit.montagem && (
                          <div className="bp-comp-nova-row" style={{ gap: '10px', flexWrap: 'wrap' }}>
                            <label>Máx. porções:&nbsp;<input type="number" min="1" max="10" value={montagemEdit.maxOpcoes} onChange={e => setMontagemEdit(prev => ({ ...prev, maxOpcoes: parseInt(e.target.value) || 1 }))} style={{ width: '55px' }} /></label>
                            <label>Porções grátis:&nbsp;<input type="number" min="0" max="10" value={montagemEdit.porcoesGratis} onChange={e => setMontagemEdit(prev => ({ ...prev, porcoesGratis: parseInt(e.target.value) || 0 }))} style={{ width: '55px' }} /></label>
                            <label>Valor adicional (R$):&nbsp;<input type="number" min="0" step="0.01" value={montagemEdit.valorAdicional} onChange={e => setMontagemEdit(prev => ({ ...prev, valorAdicional: e.target.value }))} style={{ width: '75px' }} /></label>
                          </div>
                        )}
                        <div className="bp-comp-nova-buttons">
                          <button onClick={() => handleSalvarMontagem(comp)}><FaCheck /> Salvar</button>
                          <button onClick={() => setEditMontagemId(null)}><FaTimes /> Cancelar</button>
                        </div>
                      </div>
                    )}
                    <div className="bp-comp-opcoes">
                      {comp.opcoes.map(opcao => (
                        <div key={opcao.id}>
                          <div className={`bp-comp-opcao ${!opcao.disponivel ? 'bp-comp-opcao--inativo' : ''}`}>
                            <span className="bp-comp-opcao-nome">{opcao.nome}</span>
                            {opcao.valorExtra > 0 && <span className="bp-comp-opcao-extra">+{formatCurrency(opcao.valorExtra)}</span>}
                            {opcao.estoque && (
                              <span className={`bp-comp-opcao-estoque ${opcao.estoque.quantity <= 0 ? 'bp-comp-opcao-estoque--zero' : opcao.estoque.quantity <= 3 ? 'bp-comp-opcao-estoque--low' : ''}`}>
                                📦 {opcao.estoque.name}: {opcao.estoque.quantity}
                              </span>
                            )}
                            <div className="bp-comp-opcao-actions">
                              <button
                                className={`bp-comp-opcao-toggle ${opcao.base ? 'bp-comp-opcao-toggle--base' : ''}`}
                                onClick={() => handleSalvarRegraOpcao(opcao.id, { base: !opcao.base })}
                                title={opcao.base ? 'Item base: já vem incluso e não pode ser removido no PDV' : 'Marcar como item base da variação'}
                              >
                                {opcao.base ? '★' : '☆'}
                              </button>
                              <button
                                className={`bp-comp-opcao-toggle ${opcao.exclusivo ? 'bp-comp-opcao-toggle--ativo' : ''}`}
                                onClick={() => handleSalvarRegraOpcao(opcao.id, { exclusivo: !opcao.exclusivo })}
                                title={opcao.exclusivo ? 'Exclusiva: bloqueia as demais opções do grupo' : 'Tornar exclusiva (bloqueia as demais do grupo)'}
                              >
                                {opcao.exclusivo ? '🔒' : '🔓'}
                              </button>
                              <button className="bp-comp-opcao-toggle" onClick={() => editOpcaoValorId === opcao.id ? setEditOpcaoValorId(null) : handleEditOpcaoValor(opcao)} title="Definir valor adicional deste componente"><FaPen /></button>
                              <button className={`bp-comp-opcao-toggle ${opcao.disponivel ? 'bp-comp-opcao-toggle--ativo' : ''}`} onClick={() => handleToggleOpcao(opcao.id, opcao.disponivel)} title={opcao.disponivel ? 'Desativar' : 'Ativar'}>{opcao.disponivel ? <FaCheck /> : '○'}</button>
                              <button className="bp-comp-opcao-delete" onClick={() => handleDeleteOpcao(opcao.id)}><FaTimes /></button>
                            </div>
                          </div>
                          {editOpcaoValorId === opcao.id && (
                            <div className="bp-comp-opcao-edit-valor">
                              <label>Valor adicional (R$):&nbsp;<input type="number" min="0" step="0.01" value={editOpcaoValorValue} onChange={e => setEditOpcaoValorValue(e.target.value)} autoFocus /></label>
                              <label>Ocupa da quota:&nbsp;<input type="number" min="1" step="1" value={opcao.consomeQtd || 1} onChange={e => handleSalvarRegraOpcao(opcao.id, { consomeQtd: parseInt(e.target.value, 10) || 1 })} /></label>
                              <button onClick={() => handleSalvarOpcaoValor(opcao)}><FaCheck /> Salvar</button>
                              <button onClick={() => setEditOpcaoValorId(null)}><FaTimes /> Cancelar</button>
                            </div>
                          )}
                        </div>
                      ))}
                      {novaOpcaoComp === comp.id ? (
                        <div className="bp-comp-picker">
                          <div className="bp-comp-picker-header">
                            <input
                              className="bp-comp-picker-search"
                              type="text"
                              placeholder="Buscar no estoque..."
                              value={opcaoPicker.search}
                              onChange={e => setOpcaoPicker({ search: e.target.value })}
                              autoFocus
                            />
                            <button className="bp-comp-picker-close" onClick={closePicker}><FaTimes /></button>
                          </div>
                          <div className="bp-comp-picker-valor-extra">
                            <label>Valor adicional deste componente (R$):&nbsp;
                              <input type="number" min="0" step="0.01" value={novaOpcaoValorExtra} onChange={e => setNovaOpcaoValorExtra(e.target.value)} />
                            </label>
                            <label title="Ex.: Vibe 2L ocupa 4 e bloqueia as latas">
                              <input type="checkbox" checked={novaOpcaoExclusiva} onChange={e => setNovaOpcaoExclusiva(e.target.checked)} /> Exclusiva (fecha o grupo)
                            </label>
                            <label title="Componente fixo: já vem selecionado no PDV e não pode ser removido">
                              <input type="checkbox" checked={novaOpcaoBase} onChange={e => setNovaOpcaoBase(e.target.checked)} /> Item base (já incluso)
                            </label>
                            <label>Ocupa da quota:&nbsp;
                              <input type="number" min="1" step="1" value={novaOpcaoConsumo} onChange={e => setNovaOpcaoConsumo(e.target.value)} />
                            </label>
                          </div>
                          <div className="bp-comp-picker-list">
                            {(() => {
                              const alreadyLinked = new Set(comp.opcoes.map(o => o.estoqueId).filter(Boolean));
                              const filtered = estoqueList.filter(e =>
                                e.name.toLowerCase().includes(opcaoPicker.search.toLowerCase()) &&
                                !alreadyLinked.has(e.id)
                              );
                              if (filtered.length === 0 && !opcaoPicker.search) return (
                                <div className="bp-comp-picker-empty">Todos os itens já foram adicionados ou o estoque está vazio.</div>
                              );
                              if (filtered.length === 0) return (
                                <div className="bp-comp-picker-empty">Nenhum resultado para "<strong>{opcaoPicker.search}</strong>".</div>
                              );
                              return filtered.map(e => (
                                <button
                                  key={e.id}
                                  className={`bp-comp-picker-item ${e.quantity <= 0 ? 'bp-comp-picker-item--zero' : ''}`}
                                  onClick={() => !savingOpcao && handleAddOpcaoFromEstoque(comp.id, e)}
                                  disabled={savingOpcao}
                                >
                                  <span className="bp-comp-picker-item-name">{e.name}</span>
                                  <span className={`bp-comp-picker-item-qty ${e.quantity <= 0 ? 'bp-comp-picker-item-qty--zero' : e.quantity <= 3 ? 'bp-comp-picker-item-qty--low' : ''}`}>
                                    {e.quantity} {e.unit}
                                  </span>
                                </button>
                              ));
                            })()}
                          </div>
                        </div>
                      ) : (
                        <button className="bp-comp-add-opcao-btn" onClick={() => setNovaOpcaoComp(comp.id)}>
                          <FaPlus /> Adicionar Opção
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {composicoes.length === 0 && <div className="bp-comp-empty">Nenhum componente cadastrado ainda. Adicione abaixo.</div>}
                {showNovaCompForm ? (
                  <div className="bp-comp-nova-form">
                    <h4>Novo Componente</h4>
                    <div className="bp-comp-nova-row">
                      <input type="text" placeholder="Nome do componente (ex: Selecionar Whisky)" value={novaComp.nome} onChange={e => setNovaComp(prev => ({ ...prev, nome: e.target.value }))} />
                    </div>
                    <div className="bp-comp-nova-row">
                      <input type="text" placeholder="Descrição (opcional)" value={novaComp.descricao} onChange={e => setNovaComp(prev => ({ ...prev, descricao: e.target.value }))} />
                    </div>
                    <div className="bp-comp-nova-checks">
                      <label><input type="checkbox" checked={novaComp.obrigatorio} onChange={e => setNovaComp(prev => ({ ...prev, obrigatorio: e.target.checked }))} /> Obrigatório</label>
                      <label><input type="checkbox" checked={novaComp.multiplo} onChange={e => setNovaComp(prev => ({ ...prev, multiplo: e.target.checked, maxOpcoes: e.target.checked ? prev.maxOpcoes : 1 }))} /> Seleção múltipla</label>
                      {novaComp.multiplo && !novaComp.montagem && <label>Máx. opções:&nbsp;<input type="number" min="1" max="10" value={novaComp.maxOpcoes} onChange={e => setNovaComp(prev => ({ ...prev, maxOpcoes: parseInt(e.target.value) || 1 }))} style={{ width: '50px' }} /></label>}
                    </div>
                    <div className="bp-comp-nova-checks">
                      <label><input type="checkbox" checked={novaComp.montagem} onChange={e => setNovaComp(prev => ({ ...prev, montagem: e.target.checked, multiplo: e.target.checked ? true : prev.multiplo, maxOpcoes: e.target.checked ? (prev.maxOpcoes > 1 ? prev.maxOpcoes : 4) : prev.maxOpcoes }))} /> Montagem (vários sabores)</label>
                    </div>
                    {novaComp.montagem && (
                      <div className="bp-comp-nova-row" style={{ gap: '10px', flexWrap: 'wrap' }}>
                        <label>Máx. porções:&nbsp;<input type="number" min="1" max="10" value={novaComp.maxOpcoes} onChange={e => setNovaComp(prev => ({ ...prev, maxOpcoes: parseInt(e.target.value) || 1 }))} style={{ width: '55px' }} /></label>
                        <label>Porções grátis:&nbsp;<input type="number" min="0" max="10" value={novaComp.porcoesGratis} onChange={e => setNovaComp(prev => ({ ...prev, porcoesGratis: parseInt(e.target.value) || 0 }))} style={{ width: '55px' }} /></label>
                        <label>Valor adicional (R$):&nbsp;<input type="number" min="0" step="0.01" value={novaComp.valorAdicional} onChange={e => setNovaComp(prev => ({ ...prev, valorAdicional: e.target.value }))} style={{ width: '75px' }} /></label>
                      </div>
                    )}
                    <div className="bp-comp-nova-buttons">
                      <button onClick={handleAddComposicao} disabled={!novaComp.nome.trim()}><FaCheck /> Salvar Componente</button>
                      <button onClick={() => { setShowNovaCompForm(false); setNovaComp({ nome: '', descricao: '', obrigatorio: true, multiplo: false, maxOpcoes: 1, montagem: false, porcoesGratis: 2, valorAdicional: 2.5 }); }}><FaTimes /> Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button className="bp-comp-add-btn" onClick={() => setShowNovaCompForm(true)}><FaPlus /> Adicionar Componente</button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL ESTOQUE MÍNIMO ===== */}
      {showMinimoModal && minimoItem && (
        <div className="bp-modal">
          <div className="bp-modal-content bp-modal-minimo">
            <h3 className="bp-modal-title"><FaBell /> Estoque Mínimo</h3>
            <p className="bp-minimo-desc">Defina a quantidade mínima para <strong>{minimoItem.name}</strong>. Quando o estoque atingir ou ficar abaixo desse valor, um alerta será criado na Lista de Compras.</p>
            <div className="bp-minimo-atual">
              Estoque atual: <strong>{minimoItem.quantity} {minimoItem.unit}</strong>
              {minimoMap[minimoItem.id] && (
                <span className="bp-minimo-atual-config"> &nbsp;|&nbsp; Mínimo atual: <strong>{minimoMap[minimoItem.id].quantidadeMinima}</strong></span>
              )}
            </div>
            <input
              type="number"
              min="0"
              step="0.5"
              className="bp-modal-input"
              placeholder="Quantidade mínima ideal (0 = remover)"
              value={minimoValor}
              onChange={e => setMinimoValor(e.target.value)}
              autoFocus
            />
            <div className="bp-modal-buttons">
              <button onClick={handleSaveMinimo} disabled={savingMinimo || minimoValor === ""}>
                {savingMinimo ? <FaSpinner className="bp-loading" /> : <FaCheck />} Salvar
              </button>
              <button onClick={() => setShowMinimoModal(false)}>Cancelar</button>
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

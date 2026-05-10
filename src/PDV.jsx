import axios from "axios";
import React, { useContext, useEffect, useState } from "react";
import { FaSpinner, FaPlus, FaCashRegister, FaCog, FaTrash, FaHandHoldingUsd, FaTrophy, FaSlidersH, FaCamera, FaCheck, FaArrowRight, FaArrowLeft, FaImage, FaTag, FaLock, FaUserPlus, FaSearch, FaEye, FaTimes } from "react-icons/fa";
import "./PDV.css";
import Message from "./Message";
import { AuthContext } from "./AuthContext";

const API_URL = "https://api-start-pira-qa.vercel.app";

const PDV = () => {
  const { auth } = useContext(AuthContext);

  const [activeTab, setActiveTab] = useState("venda"); // "venda", "add"
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [total, setTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [customerName, setCustomerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [amountReceived, setAmountReceived] = useState("");
  const [change, setChange] = useState(0);

  // ADD
  const [addValorTotal, setAddValorTotal] = useState("");
  const [addOrigens, setAddOrigens] = useState([{ nome: "", valor: "" }]);
  const [origensDisponiveis, setOrigensDisponiveis] = useState([]);
  const [addObservacao, setAddObservacao] = useState("");
  const [isLoadingAdd, setIsLoadingAdd] = useState(false);
  const [showOrigensConfig, setShowOrigensConfig] = useState(false);
  const [novaOrigem, setNovaOrigem] = useState("");

  // VALE
  const [valeValorTotal, setValeValorTotal] = useState("");
  const [valeOrigens, setValeOrigens] = useState([{ nome: "", valor: "" }]);
  const [valeObservacao, setValeObservacao] = useState("");
  const [isLoadingVale, setIsLoadingVale] = useState(false);
  const [showValeOrigensConfig, setShowValeOrigensConfig] = useState(false);

  // PRÊMIO
  const [premioStep, setPremioStep] = useState(1); // 1=img1, 2=img2+valor+origens, 3=confirmação
  const [premioImagem1, setPremioImagem1] = useState(null); // base64
  const [premioImagem2, setPremioImagem2] = useState(null); // base64
  const [premioValor, setPremioValor] = useState("");
  const [premioOrigens, setPremioOrigens] = useState([{ nome: "", valor: "" }]);
  const [premioObservacao, setPremioObservacao] = useState("");
  const [isLoadingPremio, setIsLoadingPremio] = useState(false);
  const [showPremioOrigensConfig, setShowPremioOrigensConfig] = useState(false);

  // CONFIG VENDA
  const [configSubTab, setConfigSubTab] = useState("cupons"); // cupons, comandas, taxas, limites, pagamentos
  const [cupons, setCupons] = useState([]);
  const [novoCupom, setNovoCupom] = useState({ codigo: "", tipo: "PERCENTUAL", valor: "", descricao: "", validoAte: "", limiteUso: "" });
  const [editCupomId, setEditCupomId] = useState(null);
  const [taxas, setTaxas] = useState([]);
  const [novaTaxa, setNovaTaxa] = useState({ nome: "", tipo: "PERCENTUAL", valor: "" });
  const [editTaxaId, setEditTaxaId] = useState(null);
  const [configLimites, setConfigLimites] = useState([]);
  const [comandasPendentes, setComandasPendentes] = useState([]);
  const [isLoadingConfig, setIsLoadingConfig] = useState(false);

  // FORMAS DE PAGAMENTO
  const [formasPagamento, setFormasPagamento] = useState([]);
  const [novaFormaPagamento, setNovaFormaPagamento] = useState("");

  // DESCONTO/CUPOM
  const [descontoTipo, setDescontoTipo] = useState("");
  const [descontoValor, setDescontoValor] = useState("");
  const [cupomCodigo, setCupomCodigo] = useState("");
  const [cupomAplicado, setCupomAplicado] = useState(null);
  const [isValidatingCupom, setIsValidatingCupom] = useState(false);

  // PAGAMENTO AVANÇADO
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState([{ forma: "", valor: "" }]);
  const [clientesFiado, setClientesFiado] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newClientName, setNewClientName] = useState("");
  const [showNewClientInput, setShowNewClientInput] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [valePassword, setValePassword] = useState("");
  const [valePasswordVerified, setValePasswordVerified] = useState(false);
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);

  // COMANDAS MODAL
  const [showComandasModal, setShowComandasModal] = useState(false);
  const [comandasClienteDetail, setComandasClienteDetail] = useState(null);
  const [isLoadingComandas, setIsLoadingComandas] = useState(false);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [showFecharComandaModal, setShowFecharComandaModal] = useState(false);
  const [comandaParaFechar, setComandaParaFechar] = useState(null);
  const [fecharFormaPagamento, setFecharFormaPagamento] = useState("dinheiro");
  const [isClosingComanda, setIsClosingComanda] = useState(false);

  useEffect(() => {
    // Buscar produtos da API quando o componente for montado
    fetchProducts();
    fetchOrigens();
    fetchFormasPagamento();
  }, []);

  useEffect(() => {
    // Filtrar produtos baseado no termo de busca
    const filtered = products.filter(
      (product) => product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  useEffect(() => {
    // Calcular total do carrinho
    const newTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setTotal(newTotal);
  }, [cart]);

  // Calcular desconto e total final
  const calcDesconto = () => {
    if (cupomAplicado) {
      if (cupomAplicado.tipo === "PERCENTUAL") return total * (cupomAplicado.valor / 100);
      return Math.min(cupomAplicado.valor, total);
    }
    if (descontoTipo === "percentual" && descontoValor) return total * (parseFloat(descontoValor) / 100);
    if (descontoTipo === "fixo" && descontoValor) return Math.min(parseFloat(descontoValor), total);
    return 0;
  };
  const desconto = calcDesconto();
  const finalTotal = Math.max(total - desconto, 0);
  const somaSplit = splitPayments.reduce((sum, s) => sum + (parseFloat(s.valor) || 0), 0);

  const getFormaNome = (valor) => {
    const f = formasPagamento.find(fp => fp.valor === valor);
    return f ? f.nome : (valor ? valor.charAt(0).toUpperCase() + valor.slice(1) : "");
  };

  useEffect(() => {
    // Calcular troco
    const receivedAmount = parseFloat(amountReceived) || 0;
    setChange(receivedAmount - finalTotal);
  }, [amountReceived, finalTotal]);

  const fetchProducts = () => {
    axios
      .get(`${API_URL}/api/estoque_prod`)
      .then((response) => {
        setProducts(response.data);
        setFilteredProducts(response.data);
      })
      .catch((error) => {
        console.error("Erro ao buscar produtos:", error);
        setMessage({ show: true, text: "Erro ao carregar produtos!", type: "error" });
        setTimeout(() => setMessage(null), 3000);
      });
  };

  const fetchOrigens = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pdv-origens`);
      setOrigensDisponiveis(response.data);
      if (response.data.length === 0) {
        await axios.post(`${API_URL}/api/pdv-origens/init`);
        const updated = await axios.get(`${API_URL}/api/pdv-origens`);
        setOrigensDisponiveis(updated.data);
      }
    } catch (error) {
      console.error("Erro ao buscar origens:", error);
    }
  };

  const fetchFormasPagamento = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/pdv-formas-pagamento`);
      setFormasPagamento(response.data);
      if (response.data.length === 0) {
        await axios.post(`${API_URL}/api/pdv-formas-pagamento/init`);
        const updated = await axios.get(`${API_URL}/api/pdv-formas-pagamento`);
        setFormasPagamento(updated.data);
      }
    } catch (error) {
      console.error("Erro ao buscar formas de pagamento:", error);
    }
  };

  const handleCriarFormaPagamento = async () => {
    if (!novaFormaPagamento.trim()) return;
    try {
      await axios.post(`${API_URL}/api/pdv-formas-pagamento`, { nome: novaFormaPagamento.trim() });
      setNovaFormaPagamento("");
      fetchFormasPagamento();
      setMessage({ show: true, text: "Forma de pagamento criada!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ show: true, text: error.response?.data?.error || "Erro ao criar forma de pagamento!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleToggleFormaPagamento = async (id, ativo) => {
    try {
      await axios.put(`${API_URL}/api/pdv-formas-pagamento/${id}`, { ativo: !ativo });
      fetchFormasPagamento();
    } catch (e) {
      setMessage({ show: true, text: "Erro ao atualizar forma de pagamento!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleExcluirFormaPagamento = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/pdv-formas-pagamento/${id}`);
      fetchFormasPagamento();
      setMessage({ show: true, text: "Forma de pagamento excluída!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ show: true, text: "Erro ao excluir forma de pagamento!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // CLIENTES FIADO - fetch para fluxo Pendente
  const fetchClientesFiado = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/clients`);
      setClientesFiado(response.data);
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    }
  };

  const handleCadastrarClienteInline = async () => {
    if (!newClientName.trim()) return;
    try {
      const res = await axios.post(`${API_URL}/api/clients`, { name: newClientName.trim(), totalDebt: 0 });
      setClientesFiado([...clientesFiado, res.data]);
      setSelectedClient(res.data);
      setCustomerName(res.data.name);
      setNewClientName("");
      setShowNewClientInput(false);
      setMessage({ show: true, text: "Cliente cadastrado!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ show: true, text: "Erro ao cadastrar cliente!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // COMANDAS - ver detalhe do cliente (purchases/payments)
  const fetchClienteDetail = async (clientId) => {
    setIsLoadingComandas(true);
    try {
      const res = await axios.get(`${API_URL}/api/clients/${clientId}`);
      setComandasClienteDetail(res.data);
      setShowComandasModal(true);
    } catch (error) {
      setMessage({ show: true, text: "Erro ao buscar dados do cliente!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
    setIsLoadingComandas(false);
  };

  // CUPOM - validar
  const handleAplicarCupom = async () => {
    if (!cupomCodigo.trim()) return;
    setIsValidatingCupom(true);
    try {
      const res = await axios.post(`${API_URL}/api/pdv-cupons/validar`, { codigo: cupomCodigo.trim() });
      setCupomAplicado(res.data);
      setDescontoTipo("");
      setDescontoValor("");
      setMessage({ show: true, text: `Cupom "${res.data.codigo}" aplicado!`, type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ show: true, text: error.response?.data?.error || "Cupom inválido!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
    setIsValidatingCupom(false);
  };

  const handleRemoverCupom = () => {
    setCupomAplicado(null);
    setCupomCodigo("");
  };

  // VALE - verificar senha (usa token JWT para identificar o usuário)
  const handleVerifyPassword = async () => {
    if (!valePassword) return;
    setIsVerifyingPassword(true);
    try {
      const token = localStorage.getItem("authToken");
      await axios.post(`${API_URL}/api/verify-vale-password`, { password: valePassword }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setValePasswordVerified(true);
      setMessage({ show: true, text: "Senha verificada!", type: "success" });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage({ show: true, text: error.response?.data?.error || "Senha incorreta!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
    setIsVerifyingPassword(false);
  };

  // SPLIT PAYMENT - handlers
  const handleAddSplit = () => setSplitPayments([...splitPayments, { forma: "", valor: "" }]);
  const handleRemoveSplit = (index) => { if (splitPayments.length > 1) setSplitPayments(splitPayments.filter((_, i) => i !== index)); };
  const handleSplitChange = (index, field, value) => { const u = [...splitPayments]; u[index][field] = value; setSplitPayments(u); };

  const handleAddOrigem = () => {
    setAddOrigens([...addOrigens, { nome: "", valor: "" }]);
  };

  const handleRemoveOrigem = (index) => {
    if (addOrigens.length <= 1) return;
    setAddOrigens(addOrigens.filter((_, i) => i !== index));
  };

  const handleOrigemChange = (index, field, value) => {
    const updated = [...addOrigens];
    updated[index][field] = value;
    setAddOrigens(updated);
  };

  const handleCriarOrigem = async () => {
    if (!novaOrigem.trim()) return;
    try {
      await axios.post(`${API_URL}/api/pdv-origens`, { nome: novaOrigem.trim() });
      setNovaOrigem("");
      fetchOrigens();
      setMessage({ show: true, text: "Origem criada com sucesso!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ show: true, text: "Erro ao criar origem!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleExcluirOrigem = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/pdv-origens/${id}`);
      fetchOrigens();
      setMessage({ show: true, text: "Origem excluída!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ show: true, text: "Erro ao excluir origem!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const somaOrigens = addOrigens.reduce((sum, o) => sum + (parseFloat(o.valor) || 0), 0);

  const handleConfirmarAdd = async () => {
    const valorTotal = parseFloat(addValorTotal);
    if (!valorTotal || valorTotal <= 0) {
      setMessage({ show: true, text: "Informe o valor a adicionar!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const origensPreenchidas = addOrigens.filter((o) => o.nome && parseFloat(o.valor) > 0);
    if (origensPreenchidas.length === 0) {
      setMessage({ show: true, text: "Informe pelo menos uma origem!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const somaOrigensVal = origensPreenchidas.reduce((sum, o) => sum + parseFloat(o.valor), 0);
    if (Math.abs(somaOrigensVal - valorTotal) > 0.01) {
      setMessage({ show: true, text: `A soma das origens (${formatCurrency(somaOrigensVal)}) deve ser igual ao valor total (${formatCurrency(valorTotal)})!`, type: "error" });
      setTimeout(() => setMessage(null), 5000);
      return;
    }

    setIsLoadingAdd(true);
    try {
      await axios.post(`${API_URL}/api/pdv-caixa-movimento`, {
        tipo: "ADD",
        valor: valorTotal,
        origens: origensPreenchidas.map((o) => ({ nome: o.nome, valor: parseFloat(o.valor) })),
        observacao: addObservacao || null,
      });
      setMessage({ show: true, text: "Valor adicionado ao caixa com sucesso!", type: "success" });
      setAddValorTotal("");
      setAddOrigens([{ nome: "", valor: "" }]);
      setAddObservacao("");
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Erro ao adicionar ao caixa:", error);
      setMessage({ show: true, text: "Erro ao adicionar valor!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
    setIsLoadingAdd(false);
  };

  // VALE - handlers
  const handleAddOrigemVale = () => {
    setValeOrigens([...valeOrigens, { nome: "", valor: "" }]);
  };

  const handleRemoveOrigemVale = (index) => {
    if (valeOrigens.length <= 1) return;
    setValeOrigens(valeOrigens.filter((_, i) => i !== index));
  };

  const handleOrigemChangeVale = (index, field, value) => {
    const updated = [...valeOrigens];
    updated[index][field] = value;
    setValeOrigens(updated);
  };

  const somaOrigensVale = valeOrigens.reduce((sum, o) => sum + (parseFloat(o.valor) || 0), 0);

  const handleConfirmarVale = async () => {
    const valorTotal = parseFloat(valeValorTotal);
    if (!valorTotal || valorTotal <= 0) {
      setMessage({ show: true, text: "Informe o valor do vale!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const origensPreenchidas = valeOrigens.filter((o) => o.nome && parseFloat(o.valor) > 0);

    if (origensPreenchidas.length > 0) {
      const somaOrigensVal = origensPreenchidas.reduce((sum, o) => sum + parseFloat(o.valor), 0);
      if (Math.abs(somaOrigensVal - valorTotal) > 0.01) {
        setMessage({ show: true, text: `A soma dos destinos (${formatCurrency(somaOrigensVal)}) deve ser igual ao valor total (${formatCurrency(valorTotal)})!`, type: "error" });
        setTimeout(() => setMessage(null), 5000);
        return;
      }
    }

    setIsLoadingVale(true);
    try {
      const resp = await axios.post(`${API_URL}/api/pdv-caixa-vale`, {
        valor: valorTotal,
        origens: origensPreenchidas.map((o) => ({ nome: o.nome, valor: parseFloat(o.valor) })),
        observacao: valeObservacao || null,
      });

      let successMsg = "Vale registrado com sucesso!";
      if (resp.data.isAdmin && resp.data.despesaPessoal) {
        successMsg += " Despesa criada no módulo Pessoal.";
      }
      setMessage({ show: true, text: successMsg, type: "success" });
      setValeValorTotal("");
      setValeOrigens([{ nome: "", valor: "" }]);
      setValeObservacao("");
      setTimeout(() => setMessage(null), 4000);
    } catch (error) {
      console.error("Erro ao registrar vale:", error);
      setMessage({ show: true, text: "Erro ao registrar vale!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
    setIsLoadingVale(false);
  };

  // PRÊMIO - handlers
  const handlePremioImageUpload = (e, setImage) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage({ show: true, text: "Selecione um arquivo de imagem válido!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ show: true, text: "Imagem muito grande! Máximo 5MB.", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  const handleAddOrigemPremio = () => {
    setPremioOrigens([...premioOrigens, { nome: "", valor: "" }]);
  };

  const handleRemoveOrigemPremio = (index) => {
    if (premioOrigens.length <= 1) return;
    setPremioOrigens(premioOrigens.filter((_, i) => i !== index));
  };

  const handleOrigemChangePremio = (index, field, value) => {
    const updated = [...premioOrigens];
    updated[index][field] = value;
    setPremioOrigens(updated);
  };

  const somaOrigensPremio = premioOrigens.reduce((sum, o) => sum + (parseFloat(o.valor) || 0), 0);

  const handlePremioAvancar = (toStep) => {
    if (toStep === 2 && !premioImagem1) {
      setMessage({ show: true, text: "Anexe a imagem de comprovação do ganho!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (toStep === 3) {
      if (!premioImagem2) {
        setMessage({ show: true, text: "Anexe a imagem de comprovação da baixa!", type: "error" });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      const valor = parseFloat(premioValor);
      if (!valor || valor <= 0) {
        setMessage({ show: true, text: "Informe o valor do prêmio!", type: "error" });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      const origensPreenchidas = premioOrigens.filter((o) => o.nome && parseFloat(o.valor) > 0);
      if (origensPreenchidas.length > 0) {
        const somaVal = origensPreenchidas.reduce((sum, o) => sum + parseFloat(o.valor), 0);
        if (Math.abs(somaVal - valor) > 0.01) {
          setMessage({ show: true, text: `A soma das origens (${formatCurrency(somaVal)}) deve ser igual ao valor (${formatCurrency(valor)})!`, type: "error" });
          setTimeout(() => setMessage(null), 5000);
          return;
        }
      }
    }
    setPremioStep(toStep);
  };

  const handleConfirmarPremio = async () => {
    setIsLoadingPremio(true);
    try {
      const origensPreenchidas = premioOrigens.filter((o) => o.nome && parseFloat(o.valor) > 0);
      await axios.post(`${API_URL}/api/pdv-premio`, {
        imagem1: premioImagem1,
        imagem2: premioImagem2,
        valor: parseFloat(premioValor),
        origens: origensPreenchidas.map((o) => ({ nome: o.nome, valor: parseFloat(o.valor) })),
        observacao: premioObservacao || null,
      });
      setMessage({ show: true, text: "Prêmio registrado com sucesso!", type: "success" });
      // Reset
      setPremioStep(1);
      setPremioImagem1(null);
      setPremioImagem2(null);
      setPremioValor("");
      setPremioOrigens([{ nome: "", valor: "" }]);
      setPremioObservacao("");
      setTimeout(() => setMessage(null), 4000);
    } catch (error) {
      console.error("Erro ao registrar prêmio:", error);
      setMessage({ show: true, text: "Erro ao registrar prêmio!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
    setIsLoadingPremio(false);
  };

  const handleCancelarPremio = () => {
    setPremioStep(1);
    setPremioImagem1(null);
    setPremioImagem2(null);
    setPremioValor("");
    setPremioOrigens([{ nome: "", valor: "" }]);
    setPremioObservacao("");
  };

  // CONFIG VENDA - fetchers
  const fetchCupons = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/pdv-cupons`);
      setCupons(res.data);
    } catch (e) { console.error("Erro ao buscar cupons:", e); }
  };

  const fetchTaxas = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/pdv-taxas`);
      setTaxas(res.data);
    } catch (e) { console.error("Erro ao buscar taxas:", e); }
  };

  const fetchConfigLimites = async () => {
    try {
      let res = await axios.get(`${API_URL}/api/pdv-config`);
      if (res.data.length === 0) {
        await axios.post(`${API_URL}/api/pdv-config/init`);
        res = await axios.get(`${API_URL}/api/pdv-config`);
      }
      setConfigLimites(res.data);
    } catch (e) { console.error("Erro ao buscar config:", e); }
  };

  const fetchComandasPendentes = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/pdv-comandas-pendentes`);
      setComandasPendentes(res.data);
    } catch (e) { console.error("Erro ao buscar comandas:", e); }
  };

  const handleFecharComanda = async () => {
    if (!comandaParaFechar) return;
    setIsClosingComanda(true);
    try {
      await axios.put(`${API_URL}/api/pdv-comandas/${comandaParaFechar.id}/fechar`, {
        paymentMethod: fecharFormaPagamento,
      });
      setMessage({ show: true, text: "Comanda fechada com sucesso!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
      setShowFecharComandaModal(false);
      setComandaParaFechar(null);
      fetchComandasPendentes();
    } catch (error) {
      const msg = error.response?.data?.error || "Erro ao fechar comanda!";
      setMessage({ show: true, text: msg, type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
    setIsClosingComanda(false);
  };

  useEffect(() => {
    if (activeTab === "config") {
      fetchCupons();
      fetchTaxas();
      fetchConfigLimites();
      fetchComandasPendentes();
      fetchFormasPagamento();
    }
  }, [activeTab]);

  // CONFIG VENDA - handlers Cupons
  const handleCriarCupom = async () => {
    if (!novoCupom.codigo || !novoCupom.valor) {
      setMessage({ show: true, text: "Código e valor são obrigatórios!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    try {
      await axios.post(`${API_URL}/api/pdv-cupons`, {
        ...novoCupom,
        valor: parseFloat(novoCupom.valor),
        limiteUso: novoCupom.limiteUso ? parseInt(novoCupom.limiteUso) : null,
        validoAte: novoCupom.validoAte || null,
      });
      setNovoCupom({ codigo: "", tipo: "PERCENTUAL", valor: "", descricao: "", validoAte: "", limiteUso: "" });
      fetchCupons();
      setMessage({ show: true, text: "Cupom criado!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ show: true, text: error.response?.data?.error || "Erro ao criar cupom!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleToggleCupom = async (id, ativo) => {
    try {
      await axios.put(`${API_URL}/api/pdv-cupons/${id}`, { ativo: !ativo });
      fetchCupons();
    } catch (e) {
      setMessage({ show: true, text: "Erro ao atualizar cupom!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleExcluirCupom = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/pdv-cupons/${id}`);
      fetchCupons();
      setMessage({ show: true, text: "Cupom excluído!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ show: true, text: "Erro ao excluir cupom!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // CONFIG VENDA - handlers Taxas
  const handleCriarTaxa = async () => {
    if (!novaTaxa.nome || !novaTaxa.valor) {
      setMessage({ show: true, text: "Nome e valor são obrigatórios!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    try {
      await axios.post(`${API_URL}/api/pdv-taxas`, {
        ...novaTaxa,
        valor: parseFloat(novaTaxa.valor),
      });
      setNovaTaxa({ nome: "", tipo: "PERCENTUAL", valor: "" });
      fetchTaxas();
      setMessage({ show: true, text: "Taxa criada!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ show: true, text: "Erro ao criar taxa!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleToggleTaxa = async (id, ativo) => {
    try {
      await axios.put(`${API_URL}/api/pdv-taxas/${id}`, { ativo: !ativo });
      fetchTaxas();
    } catch (e) {
      setMessage({ show: true, text: "Erro ao atualizar taxa!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleExcluirTaxa = async (id) => {
    try {
      await axios.delete(`${API_URL}/api/pdv-taxas/${id}`);
      fetchTaxas();
      setMessage({ show: true, text: "Taxa excluída!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ show: true, text: "Erro ao excluir taxa!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // CONFIG VENDA - handlers Limites
  const handleSalvarLimite = async (chave, valor, descricao) => {
    try {
      await axios.put(`${API_URL}/api/pdv-config/${chave}`, { valor, descricao });
      fetchConfigLimites();
      setMessage({ show: true, text: "Configuração salva!", type: "success" });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ show: true, text: "Erro ao salvar!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: product.value,
        quantity: 1,
        unit: product.unit
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item => 
      item.id === productId 
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName("");
    setAmountReceived("");
    setChange(0);
    setDescontoTipo("");
    setDescontoValor("");
    setCupomCodigo("");
    setCupomAplicado(null);
    setIsSplitPayment(false);
    setSplitPayments([{ forma: "", valor: "" }]);
    setSelectedClient(null);
    setNewClientName("");
    setShowNewClientInput(false);
    setClientSearchTerm("");
    setClientDropdownOpen(false);
    setValePassword("");
    setValePasswordVerified(false);
  };

  const handlePayment = () => {
    if (cart.length === 0) {
      setMessage({ show: true, text: "Carrinho vazio!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (isSplitPayment) {
      const formasOk = splitPayments.filter(s => s.forma && parseFloat(s.valor) > 0);
      if (formasOk.length === 0) {
        setMessage({ show: true, text: "Preencha ao menos uma forma de pagamento!", type: "error" });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
      if (Math.abs(somaSplit - finalTotal) > 0.01) {
        setMessage({ show: true, text: "A soma dos pagamentos deve ser igual ao total!", type: "error" });
        setTimeout(() => setMessage(null), 3000);
        return;
      }
    }
    const needsClients = isSplitPayment ? splitPayments.some(s => s.forma === "pendente") : paymentMethod === "pendente";
    if (needsClients) { fetchClientesFiado(); fetchConfigLimites(); }
    setValePassword("");
    setValePasswordVerified(false);
    setSelectedClient(null);
    setNewClientName("");
    setShowNewClientInput(false);
    setClientSearchTerm("");
    setAmountReceived("");
    setShowPaymentModal(true);
  };

  const canConfirmPayment = () => {
    const needsPendente = isSplitPayment ? splitPayments.some(s => s.forma === "pendente") : paymentMethod === "pendente";
    const needsVale = isSplitPayment ? splitPayments.some(s => s.forma === "vale") : paymentMethod === "vale";
    const needsDinheiro = isSplitPayment ? splitPayments.some(s => s.forma === "dinheiro") : paymentMethod === "dinheiro";
    if (needsPendente && !selectedClient) return false;
    if (needsVale && !valePasswordVerified) return false;
    if (needsDinheiro && !isSplitPayment && parseFloat(amountReceived) < finalTotal) return false;
    if (needsDinheiro && isSplitPayment) {
      const dSplit = splitPayments.find(s => s.forma === "dinheiro");
      if (dSplit && parseFloat(amountReceived) < parseFloat(dSplit.valor)) return false;
    }
    return true;
  };

  const confirmPayment = () => {
    if (!canConfirmPayment()) return;

    // Check comanda limit for pendente (usa total de comandas abertas, não totalDebt)
    const needsPendente = isSplitPayment ? splitPayments.some(s => s.forma === "pendente") : paymentMethod === "pendente";
    if (needsPendente && selectedClient) {
      const limiteConfig = configLimites.find(l => l.chave === "limite_comanda");
      const limite = limiteConfig ? parseFloat(limiteConfig.valor) : null;
      const valorPendente = isSplitPayment
        ? parseFloat(splitPayments.find(s => s.forma === "pendente")?.valor || 0)
        : finalTotal;
      const clienteComandas = comandasPendentes.find(c => c.id === selectedClient.id);
      const totalAberto = (clienteComandas?.totalComandas || 0) + valorPendente;
      if (limite && totalAberto > limite) {
        setMessage({ show: true, text: `Limite de comanda excedido! Em aberto: ${formatCurrency(clienteComandas?.totalComandas || 0)} + ${formatCurrency(valorPendente)} = ${formatCurrency(totalAberto)}, Limite: ${formatCurrency(limite)}`, type: "error" });
        setTimeout(() => setMessage(null), 5000);
        return;
      }
    }

    setIsLoading(true);

    const paymentMethodStr = isSplitPayment
      ? splitPayments.filter(s => s.forma && s.valor).map(s => `${getFormaNome(s.forma)} (${formatCurrency(parseFloat(s.valor))})`).join(" + ")
      : getFormaNome(paymentMethod);

    const needsVale = isSplitPayment ? splitPayments.some(s => s.forma === "vale") : paymentMethod === "vale";

    const saleData = {
      items: cart,
      total: finalTotal,
      paymentMethod: paymentMethodStr,
      customerName: selectedClient ? selectedClient.name : (customerName || "Cliente não identificado"),
      amountReceived: !isSplitPayment && paymentMethod === "dinheiro" ? parseFloat(amountReceived) : finalTotal,
      change: !isSplitPayment && paymentMethod === "dinheiro" ? Math.max(parseFloat(amountReceived) - finalTotal, 0) : 0,
      date: new Date().toISOString(),
      discount: desconto > 0 ? { tipo: cupomAplicado ? cupomAplicado.tipo : (descontoTipo || "").toUpperCase(), valor: desconto, cupomCodigo: cupomAplicado?.codigo || null } : null,
      splitPayments: isSplitPayment ? splitPayments.filter(s => s.forma && s.valor).map(s => ({ forma: s.forma, valor: parseFloat(s.valor) })) : null,
      pendente: needsPendente && selectedClient ? { clientId: selectedClient.id } : null,
      vale: needsVale ? { password: valePassword } : null,
      subtotal: total,
      finalTotal: finalTotal,
    };

    const token = localStorage.getItem("authToken");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    axios
      .post(`${API_URL}/api/sales`, saleData, { headers })
      .then(() => {
        setMessage({ show: true, text: "Venda realizada com sucesso!", type: "success" });
        clearCart();
        setShowPaymentModal(false);
        fetchProducts();
        setTimeout(() => setMessage(null), 3000);
      })
      .catch((error) => {
        console.error("Erro ao registrar venda:", error);
        const errorMsg = error.response?.data?.error || "Erro ao registrar venda!";
        setMessage({ show: true, text: errorMsg, type: "error" });
        setTimeout(() => setMessage(null), 5000);
      })
      .finally(() => setIsLoading(false));
  };

  const cancelPayment = () => {
    setShowPaymentModal(false);
    setAmountReceived("");
    setChange(0);
    setValePassword("");
    setValePasswordVerified(false);
    setSelectedClient(null);
    setNewClientName("");
    setShowNewClientInput(false);
    setClientSearchTerm("");
    setClientDropdownOpen(false);
  };

  return (
    <div className="pdv-container">
      <h2 className="pdv-title">PDV - Ponto de Venda</h2>

      {/* Abas de sub-módulos */}
      <div className="pdv-tabs">
        <button className={`pdv-tab ${activeTab === "venda" ? "active" : ""}`} onClick={() => setActiveTab("venda")}>
          <FaCashRegister /> Venda
        </button>
        <button className={`pdv-tab ${activeTab === "add" ? "active" : ""}`} onClick={() => setActiveTab("add")}>
          <FaPlus /> ADD
        </button>
        <button className={`pdv-tab ${activeTab === "vale" ? "active" : ""}`} onClick={() => setActiveTab("vale")}>
          <FaHandHoldingUsd /> Vale
        </button>
        <button className={`pdv-tab ${activeTab === "premio" ? "active" : ""}`} onClick={() => setActiveTab("premio")}>
          <FaTrophy /> Prêmio
        </button>
        <button className={`pdv-tab ${activeTab === "config" ? "active" : ""}`} onClick={() => setActiveTab("config")}>
          <FaSlidersH /> Config. Venda
        </button>
      </div>

      {/* ========== ABA VENDA ========== */}
      {activeTab === "venda" && (
      <div className="pdv-content">
        {/* Seção de Produtos */}
        <div className="products-section">
          <h3>Produtos</h3>
          <div className="search-bar">
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="products-grid">
            {filteredProducts.slice(0, 20).map((product) => (
              <div key={product.id} className="product-card" onClick={() => addToCart(product)}>
                <div className="product-namee">{product.name}</div>
                <div className="product-price">{formatCurrency(product.value)}</div>
                <div className="pdv-product-unit">{product.unit}</div>
                <div className="pdv-product-category">{product.category?.name || "Sem categoria"}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Seção do Carrinho */}
        <div className="cart-section">
          <h3>Carrinho</h3>
          
          <div className="customer-input">
            <input
              type="text"
              placeholder="Nome do cliente (opcional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          <div className="cart-items">
            {cart.length === 0 ? (
              <div className="empty-cart">Carrinho vazio</div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="cart-item">
                  <div className="item-info">
                    <div className="item-name">{item.name}</div>
                    <div className="item-price">{formatCurrency(item.price)}</div>
                  </div>
                  <div className="item-controls">
                    <button 
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      -
                    </button>
                    <span className="item-quantity">{item.quantity}</span>
                    <button 
                      className="qty-btn"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      +
                    </button>
                    <button 
                      className="remove-btn"
                      onClick={() => removeFromCart(item.id)}
                    >
                      🗑️
                    </button>
                  </div>
                  <div className="item-total">
                    {formatCurrency(item.price * item.quantity)}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="cart-footer">
            <div className="total-section">
              <div className="total-label">Subtotal:</div>
              <div className="total-value">{formatCurrency(total)}</div>
            </div>

            {cart.length > 0 && (
              <div className="pdv-discount-section">
                {!cupomAplicado ? (
                  <>
                    <div className="pdv-discount-row">
                      <select value={descontoTipo} onChange={(e) => { setDescontoTipo(e.target.value); setDescontoValor(""); }}>
                        <option value="">Sem desconto</option>
                        <option value="percentual">% Desconto</option>
                        <option value="valor">R$ Desconto</option>
                      </select>
                      {descontoTipo && (
                        <input
                          type="number"
                          step="0.01"
                          placeholder={descontoTipo === "percentual" ? "%" : "R$"}
                          value={descontoValor}
                          onChange={(e) => setDescontoValor(e.target.value)}
                          className="pdv-discount-input"
                        />
                      )}
                    </div>
                    <div className="pdv-cupom-row">
                      <input
                        type="text"
                        placeholder="Código do cupom"
                        value={cupomCodigo}
                        onChange={(e) => setCupomCodigo(e.target.value)}
                      />
                      <button onClick={handleAplicarCupom} disabled={!cupomCodigo || isValidatingCupom} className="pdv-cupom-btn">
                        {isValidatingCupom ? <FaSpinner className="loading-iconn" /> : <FaTag />}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="pdv-cupom-applied">
                    <FaTag /> Cupom: <strong>{cupomAplicado.codigo}</strong>{" "}
                    ({cupomAplicado.tipo === "PERCENTUAL" ? `${cupomAplicado.valor}%` : formatCurrency(cupomAplicado.valor)})
                    <button onClick={handleRemoverCupom} className="pdv-cupom-remove">✕</button>
                  </div>
                )}
                {desconto > 0 && (
                  <div className="pdv-discount-display">
                    <span>Desconto:</span>
                    <span>- {formatCurrency(desconto)}</span>
                  </div>
                )}
              </div>
            )}

            {desconto > 0 && (
              <div className="total-section pdv-final-total">
                <div className="total-label">Total Final:</div>
                <div className="total-value">{formatCurrency(finalTotal)}</div>
              </div>
            )}

            <div className="payment-method">
              <label>Forma de pagamento:</label>
              <div className="pdv-payment-row">
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={isSplitPayment}
                >
                  {formasPagamento.filter(f => f.ativo).map((f) => (
                    <option key={f.id} value={f.valor}>{f.nome}</option>
                  ))}
                  {formasPagamento.filter(f => f.ativo).length === 0 && (
                    <option value="dinheiro">Dinheiro</option>
                  )}
                </select>
                <label className="pdv-split-toggle">
                  <input
                    type="checkbox"
                    checked={isSplitPayment}
                    onChange={(e) => {
                      setIsSplitPayment(e.target.checked);
                      if (e.target.checked) {
                        setSplitPayments([{ forma: paymentMethod, valor: "" }, { forma: "", valor: "" }]);
                      } else {
                        setSplitPayments([{ forma: "", valor: "" }]);
                      }
                    }}
                  />
                  Dividir
                </label>
              </div>
            </div>

            {isSplitPayment && (
              <div className="pdv-split-section">
                {splitPayments.map((sp, idx) => (
                  <div key={idx} className="pdv-split-row">
                    <select value={sp.forma} onChange={(e) => handleSplitChange(idx, "forma", e.target.value)}>
                      <option value="">Selecione...</option>
                      {formasPagamento.filter(f => f.ativo).map((f) => (
                        <option key={f.id} value={f.valor}>{f.nome}</option>
                      ))}
                    </select>
                    <div className="pdv-split-valor">
                      <span>R$</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder="0,00"
                        value={sp.valor}
                        onChange={(e) => handleSplitChange(idx, "valor", e.target.value)}
                      />
                    </div>
                    {splitPayments.length > 2 && (
                      <button className="pdv-split-remove" onClick={() => handleRemoveSplit(idx)}>✕</button>
                    )}
                  </div>
                ))}
                <button className="pdv-split-add" onClick={handleAddSplit}><FaPlus size={10} /> Mais</button>
                <div className={`pdv-split-soma ${Math.abs(somaSplit - finalTotal) < 0.01 ? "ok" : "erro"}`}>
                  Soma: <strong>{formatCurrency(somaSplit)}</strong> / Total: <strong>{formatCurrency(finalTotal)}</strong>
                  {Math.abs(somaSplit - finalTotal) < 0.01 ? " ✔" : " ✘"}
                </div>
              </div>
            )}

            <div className="action-buttons">
              <button
                className="clear-btn"
                onClick={clearCart}
                disabled={cart.length === 0}
              >
                Limpar
              </button>
              <button
                className="payment-btn"
                onClick={handlePayment}
                disabled={cart.length === 0}
              >
                Finalizar Venda
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ========== ABA ADD ========== */}
      {activeTab === "add" && (
        <div className="pdv-add-section">
          <div className="pdv-add-card">
            <h3><FaPlus style={{ marginRight: 8 }} /> Adicionar Dinheiro ao Caixa</h3>

            <div className="pdv-add-field">
              <label>Quanto?</label>
              <div className="pdv-add-valor-input">
                <span className="pdv-currency-prefix">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={addValorTotal}
                  onChange={(e) => setAddValorTotal(e.target.value)}
                />
              </div>
            </div>

            <div className="pdv-add-field">
              <label>
                Origem(ns)
                <button className="pdv-origens-config-btn" onClick={() => setShowOrigensConfig(!showOrigensConfig)} title="Gerenciar origens">
                  <FaCog />
                </button>
              </label>

              {showOrigensConfig && (
                <div className="pdv-origens-config">
                  <div className="pdv-origens-config-header">
                    <input
                      type="text"
                      placeholder="Nova origem..."
                      value={novaOrigem}
                      onChange={(e) => setNovaOrigem(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCriarOrigem()}
                    />
                    <button onClick={handleCriarOrigem} disabled={!novaOrigem.trim()}>+</button>
                  </div>
                  <ul className="pdv-origens-list">
                    {origensDisponiveis.map((o) => (
                      <li key={o.id}>
                        <span>{o.nome}</span>
                        <button onClick={() => handleExcluirOrigem(o.id)} className="pdv-origens-delete"><FaTrash /></button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {addOrigens.map((origem, index) => (
                <div key={index} className="pdv-add-origem-row">
                  <select
                    value={origem.nome}
                    onChange={(e) => handleOrigemChange(index, "nome", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {origensDisponiveis.map((o) => (
                      <option key={o.id} value={o.nome}>{o.nome}</option>
                    ))}
                  </select>
                  <div className="pdv-add-origem-valor">
                    <span className="pdv-currency-prefix">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={origem.valor}
                      onChange={(e) => handleOrigemChange(index, "valor", e.target.value)}
                    />
                  </div>
                  {addOrigens.length > 1 && (
                    <button className="pdv-add-origem-remove" onClick={() => handleRemoveOrigem(index)}>✕</button>
                  )}
                </div>
              ))}

              <button className="pdv-add-mais-origem" onClick={handleAddOrigem}>
                <FaPlus size={10} /> Mais uma origem
              </button>

              {addOrigens.length > 0 && addValorTotal && (
                <div className={`pdv-add-soma-info ${Math.abs(somaOrigens - parseFloat(addValorTotal || 0)) < 0.01 ? "ok" : "erro"}`}>
                  Soma das origens: <strong>{formatCurrency(somaOrigens)}</strong> / Total: <strong>{formatCurrency(parseFloat(addValorTotal || 0))}</strong>
                  {Math.abs(somaOrigens - parseFloat(addValorTotal || 0)) < 0.01 ? " ✔" : " ✘"}
                </div>
              )}
            </div>

            <div className="pdv-add-field">
              <label>Observação (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Troco para início do dia"
                value={addObservacao}
                onChange={(e) => setAddObservacao(e.target.value)}
              />
            </div>

            <button className="pdv-add-confirmar" onClick={handleConfirmarAdd} disabled={isLoadingAdd}>
              {isLoadingAdd ? <FaSpinner className="loading-iconn" /> : "Confirmar Adição"}
            </button>
          </div>
        </div>
      )}

      {/* ========== ABA VALE ========== */}
      {activeTab === "vale" && (
        <div className="pdv-vale-section">
          <div className="pdv-vale-card">
            <h3><FaHandHoldingUsd style={{ marginRight: 8 }} /> Vale</h3>
            <p className="pdv-vale-subtitle">Registre retiradas de dinheiro do caixa.</p>

            <div className="pdv-vale-field">
              <label>Quanto?</label>
              <div className="pdv-vale-valor-input">
                <span className="pdv-currency-prefix">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={valeValorTotal}
                  onChange={(e) => setValeValorTotal(e.target.value)}
                />
              </div>
            </div>

            <div className="pdv-vale-field">
              <label>
                Destino(s)
                <button className="pdv-origens-config-btn" onClick={() => setShowValeOrigensConfig(!showValeOrigensConfig)} title="Gerenciar origens">
                  <FaCog />
                </button>
              </label>

              {showValeOrigensConfig && (
                <div className="pdv-origens-config">
                  <div className="pdv-origens-config-header">
                    <input
                      type="text"
                      placeholder="Nova origem..."
                      value={novaOrigem}
                      onChange={(e) => setNovaOrigem(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCriarOrigem()}
                    />
                    <button onClick={handleCriarOrigem} disabled={!novaOrigem.trim()}>+</button>
                  </div>
                  <ul className="pdv-origens-list">
                    {origensDisponiveis.map((o) => (
                      <li key={o.id}>
                        <span>{o.nome}</span>
                        <button onClick={() => handleExcluirOrigem(o.id)} className="pdv-origens-delete"><FaTrash /></button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {valeOrigens.map((origem, index) => (
                <div key={index} className="pdv-vale-origem-row">
                  <select
                    value={origem.nome}
                    onChange={(e) => handleOrigemChangeVale(index, "nome", e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {origensDisponiveis.map((o) => (
                      <option key={o.id} value={o.nome}>{o.nome}</option>
                    ))}
                  </select>
                  <div className="pdv-vale-origem-valor">
                    <span className="pdv-currency-prefix">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={origem.valor}
                      onChange={(e) => handleOrigemChangeVale(index, "valor", e.target.value)}
                    />
                  </div>
                  {valeOrigens.length > 1 && (
                    <button className="pdv-vale-origem-remove" onClick={() => handleRemoveOrigemVale(index)}>✕</button>
                  )}
                </div>
              ))}

              <button className="pdv-vale-mais-origem" onClick={handleAddOrigemVale}>
                <FaPlus size={10} /> Mais um destino
              </button>

              {valeOrigens.length > 0 && valeValorTotal && (
                <div className={`pdv-vale-soma-info ${Math.abs(somaOrigensVale - parseFloat(valeValorTotal || 0)) < 0.01 ? "ok" : "erro"}`}>
                  Soma dos destinos: <strong>{formatCurrency(somaOrigensVale)}</strong> / Total: <strong>{formatCurrency(parseFloat(valeValorTotal || 0))}</strong>
                  {Math.abs(somaOrigensVale - parseFloat(valeValorTotal || 0)) < 0.01 ? " ✔" : " ✘"}
                </div>
              )}
            </div>

            <div className="pdv-vale-field">
              <label>Observação (opcional)</label>
              <input
                type="text"
                placeholder="Ex: Pagamento fornecedor, vale funcionário..."
                value={valeObservacao}
                onChange={(e) => setValeObservacao(e.target.value)}
              />
            </div>

            <div className="pdv-vale-info-admin">
              ⓘ Se você for administrador, este vale também será registrado como despesa no módulo <strong>Pessoal</strong>.
            </div>

            <button className="pdv-vale-confirmar" onClick={handleConfirmarVale} disabled={isLoadingVale}>
              {isLoadingVale ? <FaSpinner className="loading-iconn" /> : "Confirmar Vale"}
            </button>
          </div>
        </div>
      )}

      {/* ========== ABA PRÊMIO ========== */}
      {activeTab === "premio" && (
        <div className="pdv-premio-section">
          <div className="pdv-premio-card">
            <h3><FaTrophy style={{ marginRight: 8 }} /> Registrar Prêmio</h3>

            {/* Indicador de etapas */}
            <div className="pdv-premio-steps">
              <div className={`pdv-premio-step-dot ${premioStep >= 1 ? "active" : ""} ${premioStep > 1 ? "done" : ""}`}>
                {premioStep > 1 ? <FaCheck size={10} /> : "1"}
              </div>
              <div className={`pdv-premio-step-line ${premioStep >= 2 ? "active" : ""}`} />
              <div className={`pdv-premio-step-dot ${premioStep >= 2 ? "active" : ""} ${premioStep > 2 ? "done" : ""}`}>
                {premioStep > 2 ? <FaCheck size={10} /> : "2"}
              </div>
              <div className={`pdv-premio-step-line ${premioStep >= 3 ? "active" : ""}`} />
              <div className={`pdv-premio-step-dot ${premioStep >= 3 ? "active" : ""}`}>
                3
              </div>
            </div>
            <div className="pdv-premio-step-labels">
              <span className={premioStep === 1 ? "active" : ""}>Comprovante do Ganho</span>
              <span className={premioStep === 2 ? "active" : ""}>Baixa + Valor</span>
              <span className={premioStep === 3 ? "active" : ""}>Confirmação</span>
            </div>

            {/* ETAPA 1: Imagem do ganho */}
            {premioStep === 1 && (
              <div className="pdv-premio-step-content">
                <p className="pdv-premio-step-desc">Anexe a foto que comprova o ganho do cliente no caça-níquel.</p>
                <div className="pdv-premio-upload-area">
                  {premioImagem1 ? (
                    <div className="pdv-premio-preview">
                      <img src={premioImagem1} alt="Comprovante do ganho" />
                      <button className="pdv-premio-preview-remove" onClick={() => setPremioImagem1(null)}>✕</button>
                    </div>
                  ) : (
                    <label className="pdv-premio-upload-label">
                      <FaCamera size={28} />
                      <span>Clique ou toque para anexar imagem</span>
                      <small>JPG, PNG — Máx. 5MB</small>
                      <input type="file" accept="image/*" onChange={(e) => handlePremioImageUpload(e, setPremioImagem1)} hidden />
                    </label>
                  )}
                </div>
                <div className="pdv-premio-step-actions">
                  <button className="pdv-premio-btn-next" onClick={() => handlePremioAvancar(2)} disabled={!premioImagem1}>
                    Avançar <FaArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 2: Imagem da baixa + valor + origens */}
            {premioStep === 2 && (
              <div className="pdv-premio-step-content">
                <p className="pdv-premio-step-desc">Anexe a foto que comprova a baixa do valor no jogo, informe o valor e a(s) origem(ns).</p>

                <div className="pdv-premio-upload-area">
                  {premioImagem2 ? (
                    <div className="pdv-premio-preview">
                      <img src={premioImagem2} alt="Comprovante da baixa" />
                      <button className="pdv-premio-preview-remove" onClick={() => setPremioImagem2(null)}>✕</button>
                    </div>
                  ) : (
                    <label className="pdv-premio-upload-label">
                      <FaCamera size={28} />
                      <span>Clique ou toque para anexar imagem</span>
                      <small>JPG, PNG — Máx. 5MB</small>
                      <input type="file" accept="image/*" onChange={(e) => handlePremioImageUpload(e, setPremioImagem2)} hidden />
                    </label>
                  )}
                </div>

                <div className="pdv-premio-field">
                  <label>Valor do Prêmio</label>
                  <div className="pdv-premio-valor-input">
                    <span className="pdv-currency-prefix">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={premioValor}
                      onChange={(e) => setPremioValor(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pdv-premio-field">
                  <label>
                    Origem(ns) do pagamento
                    <button className="pdv-origens-config-btn" onClick={() => setShowPremioOrigensConfig(!showPremioOrigensConfig)} title="Gerenciar origens">
                      <FaCog />
                    </button>
                  </label>

                  {showPremioOrigensConfig && (
                    <div className="pdv-origens-config">
                      <div className="pdv-origens-config-header">
                        <input
                          type="text"
                          placeholder="Nova origem..."
                          value={novaOrigem}
                          onChange={(e) => setNovaOrigem(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleCriarOrigem()}
                        />
                        <button onClick={handleCriarOrigem} disabled={!novaOrigem.trim()}>+</button>
                      </div>
                      <ul className="pdv-origens-list">
                        {origensDisponiveis.map((o) => (
                          <li key={o.id}>
                            <span>{o.nome}</span>
                            <button onClick={() => handleExcluirOrigem(o.id)} className="pdv-origens-delete"><FaTrash /></button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {premioOrigens.map((origem, index) => (
                    <div key={index} className="pdv-premio-origem-row">
                      <select
                        value={origem.nome}
                        onChange={(e) => handleOrigemChangePremio(index, "nome", e.target.value)}
                      >
                        <option value="">Selecione...</option>
                        {origensDisponiveis.map((o) => (
                          <option key={o.id} value={o.nome}>{o.nome}</option>
                        ))}
                      </select>
                      <div className="pdv-premio-origem-valor">
                        <span className="pdv-currency-prefix">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0,00"
                          value={origem.valor}
                          onChange={(e) => handleOrigemChangePremio(index, "valor", e.target.value)}
                        />
                      </div>
                      {premioOrigens.length > 1 && (
                        <button className="pdv-premio-origem-remove" onClick={() => handleRemoveOrigemPremio(index)}>✕</button>
                      )}
                    </div>
                  ))}

                  <button className="pdv-premio-mais-origem" onClick={handleAddOrigemPremio}>
                    <FaPlus size={10} /> Mais uma origem
                  </button>

                  {premioOrigens.length > 0 && premioValor && (
                    <div className={`pdv-premio-soma-info ${Math.abs(somaOrigensPremio - parseFloat(premioValor || 0)) < 0.01 ? "ok" : "erro"}`}>
                      Soma das origens: <strong>{formatCurrency(somaOrigensPremio)}</strong> / Total: <strong>{formatCurrency(parseFloat(premioValor || 0))}</strong>
                      {Math.abs(somaOrigensPremio - parseFloat(premioValor || 0)) < 0.01 ? " ✔" : " ✘"}
                    </div>
                  )}
                </div>

                <div className="pdv-premio-field">
                  <label>Observação (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Cliente João, máquina 3..."
                    value={premioObservacao}
                    onChange={(e) => setPremioObservacao(e.target.value)}
                  />
                </div>

                <div className="pdv-premio-step-actions dual">
                  <button className="pdv-premio-btn-back" onClick={() => setPremioStep(1)}>
                    <FaArrowLeft size={12} /> Voltar
                  </button>
                  <button className="pdv-premio-btn-next" onClick={() => handlePremioAvancar(3)}>
                    Revisar <FaArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 3: Confirmação */}
            {premioStep === 3 && (
              <div className="pdv-premio-step-content">
                <p className="pdv-premio-step-desc">Revise as informações antes de confirmar:</p>

                <div className="pdv-premio-confirm-grid">
                  <div className="pdv-premio-confirm-img">
                    <span className="pdv-premio-confirm-label"><FaImage size={12} /> Comprovante do Ganho</span>
                    {premioImagem1 && <img src={premioImagem1} alt="Ganho" />}
                  </div>
                  <div className="pdv-premio-confirm-img">
                    <span className="pdv-premio-confirm-label"><FaImage size={12} /> Comprovante da Baixa</span>
                    {premioImagem2 && <img src={premioImagem2} alt="Baixa" />}
                  </div>
                </div>

                <div className="pdv-premio-confirm-info">
                  <div className="pdv-premio-confirm-row">
                    <span>Valor do Prêmio:</span>
                    <strong>{formatCurrency(parseFloat(premioValor || 0))}</strong>
                  </div>
                  {premioOrigens.filter(o => o.nome && o.valor).length > 0 && (
                    <div className="pdv-premio-confirm-row">
                      <span>Origens:</span>
                      <strong>{premioOrigens.filter(o => o.nome && o.valor).map(o => `${o.nome} (${formatCurrency(parseFloat(o.valor))})`).join(", ")}</strong>
                    </div>
                  )}
                  {premioObservacao && (
                    <div className="pdv-premio-confirm-row">
                      <span>Observação:</span>
                      <strong>{premioObservacao}</strong>
                    </div>
                  )}
                </div>

                <div className="pdv-premio-step-actions dual">
                  <button className="pdv-premio-btn-back" onClick={() => setPremioStep(2)}>
                    <FaArrowLeft size={12} /> Voltar
                  </button>
                  <button className="pdv-premio-btn-confirm" onClick={handleConfirmarPremio} disabled={isLoadingPremio}>
                    {isLoadingPremio ? <FaSpinner className="loading-iconn" /> : <><FaCheck size={12} /> Confirmar Prêmio</>}
                  </button>
                </div>

                <button className="pdv-premio-btn-cancelar" onClick={handleCancelarPremio}>
                  Cancelar e recomeçar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========== ABA CONFIG. VENDA ========== */}
      {activeTab === "config" && (
        <div className="pdv-config-section">
          <div className="pdv-config-card">
            <h3><FaSlidersH style={{ marginRight: 8 }} /> Configuração de Venda</h3>

            {/* Sub-tabs */}
            <div className="pdv-config-subtabs">
              <button className={configSubTab === "cupons" ? "active" : ""} onClick={() => setConfigSubTab("cupons")}>Cupons</button>
              <button className={configSubTab === "comandas" ? "active" : ""} onClick={() => setConfigSubTab("comandas")}>Comandas</button>
              <button className={configSubTab === "taxas" ? "active" : ""} onClick={() => setConfigSubTab("taxas")}>Taxas</button>
              <button className={configSubTab === "limites" ? "active" : ""} onClick={() => setConfigSubTab("limites")}>Limites</button>
              <button className={configSubTab === "pagamentos" ? "active" : ""} onClick={() => setConfigSubTab("pagamentos")}>Pagamentos</button>
            </div>

            {/* ---- CUPONS ---- */}
            {configSubTab === "cupons" && (
              <div className="pdv-config-panel">
                <div className="pdv-config-form-row">
                  <input placeholder="Código" value={novoCupom.codigo} onChange={(e) => setNovoCupom({ ...novoCupom, codigo: e.target.value })} />
                  <select value={novoCupom.tipo} onChange={(e) => setNovoCupom({ ...novoCupom, tipo: e.target.value })}>
                    <option value="PERCENTUAL">% Desconto</option>
                    <option value="FIXO">R$ Fixo</option>
                  </select>
                  <input type="number" placeholder="Valor" step="0.01" value={novoCupom.valor} onChange={(e) => setNovoCupom({ ...novoCupom, valor: e.target.value })} />
                </div>
                <div className="pdv-config-form-row">
                  <input placeholder="Descrição (opcional)" value={novoCupom.descricao} onChange={(e) => setNovoCupom({ ...novoCupom, descricao: e.target.value })} />
                  <input type="date" placeholder="Válido até" value={novoCupom.validoAte} onChange={(e) => setNovoCupom({ ...novoCupom, validoAte: e.target.value })} />
                  <input type="number" placeholder="Limite uso" min="1" value={novoCupom.limiteUso} onChange={(e) => setNovoCupom({ ...novoCupom, limiteUso: e.target.value })} />
                  <button className="pdv-config-btn-add" onClick={handleCriarCupom}><FaPlus /> Criar</button>
                </div>

                {cupons.length === 0 ? (
                  <p className="pdv-config-empty">Nenhum cupom cadastrado.</p>
                ) : (
                  <div className="pdv-config-table-wrap">
                    <table className="pdv-config-table">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Tipo</th>
                          <th>Valor</th>
                          <th>Validade</th>
                          <th>Uso</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cupons.map((c) => (
                          <tr key={c.id} className={!c.ativo ? "pdv-config-row-disabled" : ""}>
                            <td><strong>{c.codigo}</strong></td>
                            <td>{c.tipo === "PERCENTUAL" ? "%" : "R$"}</td>
                            <td>{c.tipo === "PERCENTUAL" ? `${c.valor}%` : formatCurrency(c.valor)}</td>
                            <td>{c.validoAte ? new Date(c.validoAte).toLocaleDateString("pt-BR") : "∞"}</td>
                            <td>{c.vezesUsado}{c.limiteUso ? `/${c.limiteUso}` : "/∞"}</td>
                            <td>
                              <span className={`pdv-config-badge ${c.ativo ? "ativo" : "inativo"}`}>
                                {c.ativo ? "Ativo" : "Inativo"}
                              </span>
                            </td>
                            <td className="pdv-config-actions">
                              <button onClick={() => handleToggleCupom(c.id, c.ativo)} title={c.ativo ? "Desativar" : "Ativar"}>
                                {c.ativo ? "⏸" : "▶"}
                              </button>
                              <button onClick={() => handleExcluirCupom(c.id)} className="delete" title="Excluir">🗑</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ---- COMANDAS ---- */}
            {configSubTab === "comandas" && (
              <div className="pdv-config-panel">
                <p className="pdv-config-panel-desc">Comandas abertas (pendentes de pagamento):</p>

                <button className="pdv-config-btn-add" onClick={fetchComandasPendentes} style={{ marginBottom: 12 }}>
                  <FaSearch /> Atualizar
                </button>

                {comandasPendentes.length === 0 ? (
                  <p className="pdv-config-empty">Nenhuma comanda aberta no momento.</p>
                ) : (
                  <div className="pdv-comandas-cards">
                    {comandasPendentes.map((cliente) => (
                      <div key={cliente.id} className="pdv-comanda-client-card">
                        <div className="pdv-comanda-client-header">
                          <h4>{cliente.name}</h4>
                          <span className="pdv-comanda-client-total">
                            Total em aberto: <strong>{formatCurrency(cliente.totalComandas)}</strong>
                          </span>
                        </div>

                        <div className="pdv-comanda-list">
                          {cliente.comandas.map((comanda) => (
                            <div key={comanda.id} className="pdv-comanda-card">
                              <div className="pdv-comanda-card-top">
                                <span className="pdv-comanda-id">#{comanda.id}</span>
                                <span className="pdv-comanda-valor">{formatCurrency(comanda.total)}</span>
                                <span className="pdv-comanda-time">
                                  {new Date(comanda.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <div className="pdv-comanda-items">
                                {comanda.items.map((item, idx) => (
                                  <span key={idx} className="pdv-comanda-item-tag">
                                    {item.quantity}x {item.productName}
                                  </span>
                                ))}
                              </div>
                              <div className="pdv-comanda-card-actions">
                                <button
                                  className="pdv-comanda-fechar-btn"
                                  onClick={() => {
                                    setComandaParaFechar(comanda);
                                    setFecharFormaPagamento("dinheiro");
                                    setShowFecharComandaModal(true);
                                  }}
                                >
                                  <FaCheck size={11} /> Fechar Comanda
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {comandasPendentes.length > 0 && (
                  <div className="pdv-config-comandas-summary">
                    <span>Total geral pendente: <strong>{formatCurrency(comandasPendentes.reduce((s, c) => s + c.totalComandas, 0))}</strong></span>
                    <span>Comandas abertas: <strong>{comandasPendentes.reduce((s, c) => s + c.comandas.length, 0)}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* ---- TAXAS ---- */}
            {configSubTab === "taxas" && (
              <div className="pdv-config-panel">
                <div className="pdv-config-form-row">
                  <input placeholder="Nome da taxa" value={novaTaxa.nome} onChange={(e) => setNovaTaxa({ ...novaTaxa, nome: e.target.value })} />
                  <select value={novaTaxa.tipo} onChange={(e) => setNovaTaxa({ ...novaTaxa, tipo: e.target.value })}>
                    <option value="PERCENTUAL">% Percentual</option>
                    <option value="FIXO">R$ Fixo</option>
                  </select>
                  <input type="number" placeholder="Valor" step="0.01" value={novaTaxa.valor} onChange={(e) => setNovaTaxa({ ...novaTaxa, valor: e.target.value })} />
                  <button className="pdv-config-btn-add" onClick={handleCriarTaxa}><FaPlus /> Criar</button>
                </div>

                {taxas.length === 0 ? (
                  <p className="pdv-config-empty">Nenhuma taxa cadastrada.</p>
                ) : (
                  <div className="pdv-config-table-wrap">
                    <table className="pdv-config-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Tipo</th>
                          <th>Valor</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {taxas.map((t) => (
                          <tr key={t.id} className={!t.ativo ? "pdv-config-row-disabled" : ""}>
                            <td><strong>{t.nome}</strong></td>
                            <td>{t.tipo === "PERCENTUAL" ? "%" : "R$"}</td>
                            <td>{t.tipo === "PERCENTUAL" ? `${t.valor}%` : `R$ ${t.valor.toFixed(2)}`}</td>
                            <td>
                              <span className={`pdv-config-badge ${t.ativo ? "ativo" : "inativo"}`}>
                                {t.ativo ? "Ativa" : "Inativa"}
                              </span>
                            </td>
                            <td className="pdv-config-actions">
                              <button onClick={() => handleToggleTaxa(t.id, t.ativo)} title={t.ativo ? "Desativar" : "Ativar"}>
                                {t.ativo ? "⏸" : "▶"}
                              </button>
                              <button onClick={() => handleExcluirTaxa(t.id)} className="delete" title="Excluir">🗑</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ---- LIMITES ---- */}
            {configSubTab === "limites" && (
              <div className="pdv-config-panel">
                <p className="pdv-config-panel-desc">Defina os limites e regras para comandas e vendas:</p>
                {configLimites.map((cfg) => (
                  <div key={cfg.id} className="pdv-config-limite-row">
                    <div className="pdv-config-limite-info">
                      <strong>{cfg.chave.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</strong>
                      {cfg.descricao && <small>{cfg.descricao}</small>}
                    </div>
                    <div className="pdv-config-limite-input">
                      <input
                        type="number"
                        value={cfg.valor}
                        onChange={(e) => {
                          setConfigLimites(configLimites.map(c => c.id === cfg.id ? { ...c, valor: e.target.value } : c));
                        }}
                      />
                      <button onClick={() => handleSalvarLimite(cfg.chave, cfg.valor, cfg.descricao)}>Salvar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ---- PAGAMENTOS ---- */}
            {configSubTab === "pagamentos" && (
              <div className="pdv-config-panel">
                <p className="pdv-config-panel-desc">Gerencie as formas de pagamento disponíveis na venda:</p>
                <div className="pdv-config-form-row">
                  <input
                    placeholder="Nome da forma de pagamento"
                    value={novaFormaPagamento}
                    onChange={(e) => setNovaFormaPagamento(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCriarFormaPagamento()}
                  />
                  <button className="pdv-config-btn-add" onClick={handleCriarFormaPagamento} disabled={!novaFormaPagamento.trim()}>
                    <FaPlus /> Criar
                  </button>
                </div>

                {formasPagamento.length === 0 ? (
                  <p className="pdv-config-empty">Nenhuma forma de pagamento cadastrada.</p>
                ) : (
                  <div className="pdv-config-table-wrap">
                    <table className="pdv-config-table">
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Valor Interno</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formasPagamento.map((f) => (
                          <tr key={f.id} className={!f.ativo ? "pdv-config-row-disabled" : ""}>
                            <td><strong>{f.nome}</strong></td>
                            <td>{f.valor}</td>
                            <td>
                              <span className={`pdv-config-badge ${f.ativo ? "ativo" : "inativo"}`}>
                                {f.ativo ? "Ativa" : "Inativa"}
                              </span>
                            </td>
                            <td className="pdv-config-actions">
                              <button onClick={() => handleToggleFormaPagamento(f.id, f.ativo)} title={f.ativo ? "Desativar" : "Ativar"}>
                                {f.ativo ? "⏸" : "▶"}
                              </button>
                              <button onClick={() => handleExcluirFormaPagamento(f.id)} className="delete" title="Excluir">🗑</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Pagamento */}
      {showPaymentModal && (
        <div className="modal">
          <div className="modal-content payment-modal">
            <h3>Finalizar Pagamento</h3>

            <div className="payment-summary">
              <div className="summary-row">
                <span>Subtotal:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              {desconto > 0 && (
                <div className="summary-row pdv-summary-discount">
                  <span>Desconto:</span>
                  <span>- {formatCurrency(desconto)}</span>
                </div>
              )}
              <div className="summary-row pdv-summary-final">
                <span>Total:</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
              <div className="summary-row">
                <span>Pagamento:</span>
                <span>{isSplitPayment ? "Dividido" : getFormaNome(paymentMethod)}</span>
              </div>
              {isSplitPayment && (
                <div className="pdv-modal-split-detail">
                  {splitPayments.filter(s => s.forma && s.valor).map((s, idx) => (
                    <div key={idx} className="summary-row pdv-split-detail-row">
                      <span>{getFormaNome(s.forma)}:</span>
                      <span>{formatCurrency(parseFloat(s.valor))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PENDENTE - Seleção de Cliente */}
            {(isSplitPayment ? splitPayments.some(s => s.forma === "pendente") : paymentMethod === "pendente") && (
              <div className="pdv-pendente-section">
                <h4><FaSearch size={14} /> Selecionar Cliente (Comanda)</h4>

                <div className="pdv-client-select-wrapper">
                  <div className="pdv-client-select-box" onClick={() => setClientDropdownOpen(!clientDropdownOpen)}>
                    <span className={selectedClient ? "" : "pdv-client-placeholder"}>
                      {selectedClient ? selectedClient.name : "Selecione um cliente..."}
                    </span>
                    <span className="pdv-client-select-arrow">{clientDropdownOpen ? "▲" : "▼"}</span>
                  </div>

                  {clientDropdownOpen && (
                    <div className="pdv-client-dropdown">
                      <div className="pdv-client-dropdown-search">
                        <FaSearch size={12} />
                        <input
                          type="text"
                          placeholder="Buscar cliente..."
                          value={clientSearchTerm}
                          onChange={(e) => setClientSearchTerm(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="pdv-client-dropdown-list">
                        {clientesFiado
                          .filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase()))
                          .map(c => (
                            <div
                              key={c.id}
                              className={`pdv-client-dropdown-item ${selectedClient?.id === c.id ? "selected" : ""}`}
                              onClick={() => {
                                setSelectedClient(c);
                                setCustomerName(c.name);
                                setClientDropdownOpen(false);
                                setClientSearchTerm("");
                              }}
                            >
                              <span>{c.name}</span>
                              {selectedClient?.id === c.id && <FaCheck size={12} />}
                            </div>
                          ))}
                        {clientesFiado.filter(c => c.name.toLowerCase().includes(clientSearchTerm.toLowerCase())).length === 0 && (
                          <div className="pdv-client-dropdown-empty">Nenhum cliente encontrado</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pdv-pendente-actions">
                  {!showNewClientInput ? (
                    <button className="pdv-new-client-btn" onClick={() => setShowNewClientInput(true)}>
                      <FaUserPlus size={12} /> Cadastrar novo
                    </button>
                  ) : (
                    <div className="pdv-new-client-form">
                      <input
                        type="text"
                        placeholder="Nome do novo cliente"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                      />
                      <button onClick={handleCadastrarClienteInline} disabled={!newClientName.trim()}>Salvar</button>
                      <button onClick={() => { setShowNewClientInput(false); setNewClientName(""); }}>Cancelar</button>
                    </div>
                  )}

                  {selectedClient && (
                    <button
                      className="pdv-ver-comandas-btn"
                      onClick={() => fetchClienteDetail(selectedClient.id)}
                      disabled={isLoadingComandas}
                    >
                      {isLoadingComandas ? <FaSpinner className="loading-iconn" /> : <><FaEye size={12} /> Ver Comandas</>}
                    </button>
                  )}
                </div>

                {selectedClient && (
                  <div className="pdv-selected-client">
                    ✅ Cliente: <strong>{selectedClient.name}</strong> — Débito atual: {formatCurrency(selectedClient.totalDebt)}
                  </div>
                )}
              </div>
            )}

            {/* VALE - Verificação de Senha */}
            {(isSplitPayment ? splitPayments.some(s => s.forma === "vale") : paymentMethod === "vale") && (
              <div className="pdv-vale-verify-section">
                <h4><FaLock size={14} /> Confirmar Vale (Senha)</h4>
                {!valePasswordVerified ? (
                  <div className="pdv-vale-verify-form">
                    <input
                      type="password"
                      placeholder="Digite sua senha"
                      value={valePassword}
                      onChange={(e) => setValePassword(e.target.value)}
                    />
                    <button onClick={handleVerifyPassword} disabled={!valePassword || isVerifyingPassword}>
                      {isVerifyingPassword ? <FaSpinner className="loading-iconn" /> : "Verificar"}
                    </button>
                  </div>
                ) : (
                  <div className="pdv-vale-verified">✅ Senha verificada com sucesso</div>
                )}
              </div>
            )}

            {/* DINHEIRO - Pagamento em Espécie */}
            {(isSplitPayment ? splitPayments.some(s => s.forma === "dinheiro") : paymentMethod === "dinheiro") && (
              <div className="cash-payment">
                <label>Valor recebido em dinheiro:</label>
                <input
                  type="number"
                  step="0.01"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="0,00"
                />
                <div className="change-display">
                  <span>Troco: {formatCurrency(
                    isSplitPayment
                      ? Math.max(parseFloat(amountReceived || 0) - parseFloat(splitPayments.find(s => s.forma === "dinheiro")?.valor || 0), 0)
                      : change
                  )}</span>
                </div>
              </div>
            )}

            <div className="modal-buttons">
              <button
                onClick={confirmPayment}
                disabled={isLoading || !canConfirmPayment()}
              >
                {isLoading ? <FaSpinner className="loading-iconn" /> : "Confirmar Pagamento"}
              </button>
              <button onClick={cancelPayment}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Comandas Pendentes */}
      {showComandasModal && comandasClienteDetail && (
        <div className="modal">
          <div className="modal-content pdv-comandas-modal">
            <div className="pdv-comandas-header">
              <h3>Comandas — {comandasClienteDetail.name}</h3>
              <button className="pdv-comandas-close" onClick={() => setShowComandasModal(false)}><FaTimes /></button>
            </div>

            <div className="pdv-comandas-summary-bar">
              <div className="pdv-comandas-summary-item">
                <span>Débito Total</span>
                <strong className="pdv-debt-value">{formatCurrency(comandasClienteDetail.totalDebt)}</strong>
              </div>
              <div className="pdv-comandas-summary-item">
                <span>Compras</span>
                <strong>{comandasClienteDetail.Purchase?.length || 0}</strong>
              </div>
              <div className="pdv-comandas-summary-item">
                <span>Pagamentos</span>
                <strong>{comandasClienteDetail.Payment?.length || 0}</strong>
              </div>
            </div>

            {comandasClienteDetail.Purchase && comandasClienteDetail.Purchase.length > 0 ? (
              <div className="pdv-comandas-table-wrap">
                <h4>Compras Pendentes</h4>
                <table className="pdv-comandas-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th>Qtd</th>
                      <th>Total</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comandasClienteDetail.Purchase.map(p => (
                      <tr key={p.id}>
                        <td>{p.product}</td>
                        <td>{p.quantity}</td>
                        <td>{formatCurrency(p.total)}</td>
                        <td>{new Date(p.date).toLocaleDateString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pdv-comandas-empty">Nenhuma compra pendente.</div>
            )}

            {comandasClienteDetail.Payment && comandasClienteDetail.Payment.length > 0 && (
              <div className="pdv-comandas-table-wrap">
                <h4>Pagamentos Realizados</h4>
                <table className="pdv-comandas-table">
                  <thead>
                    <tr>
                      <th>Valor</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comandasClienteDetail.Payment.map(pay => (
                      <tr key={pay.id}>
                        <td>{formatCurrency(pay.amount)}</td>
                        <td>{new Date(pay.date).toLocaleDateString("pt-BR")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pdv-comandas-footer">
              <button className="pdv-comandas-close-btn" onClick={() => setShowComandasModal(false)}>
                Fechar
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

      {/* Modal Fechar Comanda */}
      {showFecharComandaModal && comandaParaFechar && (
        <div className="modal">
          <div className="modal-content pdv-fechar-comanda-modal">
            <div className="pdv-fechar-comanda-header">
              <h3>Fechar Comanda #{comandaParaFechar.id}</h3>
              <button className="pdv-comandas-close" onClick={() => { setShowFecharComandaModal(false); setComandaParaFechar(null); }}><FaTimes /></button>
            </div>

            <div className="pdv-fechar-comanda-body">
              <div className="pdv-fechar-comanda-info">
                <span className="pdv-fechar-comanda-label">Valor total</span>
                <span className="pdv-fechar-comanda-valor">{formatCurrency(comandaParaFechar.total)}</span>
              </div>

              <div className="pdv-fechar-comanda-info">
                <span className="pdv-fechar-comanda-label">Aberta em</span>
                <span>{new Date(comandaParaFechar.createdAt).toLocaleString("pt-BR")}</span>
              </div>

              <div className="pdv-fechar-comanda-itens">
                <strong>Itens:</strong>
                <ul>
                  {comandaParaFechar.items.map((item, idx) => (
                    <li key={idx}>{item.quantity}x {item.productName} — {formatCurrency(item.total)}</li>
                  ))}
                </ul>
              </div>

              <div className="pdv-fechar-comanda-forma">
                <label>Forma de pagamento:</label>
                <select value={fecharFormaPagamento} onChange={(e) => setFecharFormaPagamento(e.target.value)}>
                  {configFormasPagamento.filter(f => f.ativa && f.nome !== "pendente").map(f => (
                    <option key={f.id} value={f.nome}>{f.nome.charAt(0).toUpperCase() + f.nome.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pdv-fechar-comanda-footer">
              <button className="pdv-fechar-comanda-cancel" onClick={() => { setShowFecharComandaModal(false); setComandaParaFechar(null); }}>
                Cancelar
              </button>
              <button className="pdv-fechar-comanda-confirm" disabled={isClosingComanda} onClick={handleFecharComanda}>
                {isClosingComanda ? <FaSpinner className="spinner" /> : <FaCheck />} Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PDV;

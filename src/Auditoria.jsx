import axios from "axios";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { FaClipboardList, FaCog, FaChevronDown, FaChevronUp, FaSpinner, FaSearch } from "react-icons/fa";
import "./Auditoria.css";

const API_URL = "https://api-start-pira.vercel.app";

const Auditoria = () => {
  const [registros, setRegistros] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);

  // Filtros
  const [filtroModulo, setFiltroModulo] = useState("");
  const [filtroAcao, setFiltroAcao] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  // Listas para filtros
  const [modulosDisponiveis, setModulosDisponiveis] = useState([]);
  const [usuariosDisponiveis, setUsuariosDisponiveis] = useState([]);

  // Config de auditoria
  const [configs, setConfigs] = useState([]);
  const [showConfig, setShowConfig] = useState(false);

  // Buscar dados iniciais
  useEffect(() => {
    fetchModulos();
    fetchUsuarios();
    fetchConfigs();
  }, []);

  // Buscar registros quando filtros ou página mudam
  useEffect(() => {
    fetchRegistros();
  }, [page]);

  // Buscar estatísticas quando filtros de data mudam
  useEffect(() => {
    fetchStats();
  }, [filtroDataInicio, filtroDataFim]);

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", 50);
      if (filtroModulo) params.append("modulo", filtroModulo);
      if (filtroAcao) params.append("acao", filtroAcao);
      if (filtroUsuario) params.append("userName", filtroUsuario);
      if (filtroDataInicio) params.append("dataInicio", filtroDataInicio);
      if (filtroDataFim) params.append("dataFim", filtroDataFim);

      const response = await axios.get(`${API_URL}/api/auditoria?${params.toString()}`);
      setRegistros(response.data.registros);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error("Erro ao buscar auditoria:", error);
    }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams();
      if (filtroDataInicio) params.append("dataInicio", filtroDataInicio);
      if (filtroDataFim) params.append("dataFim", filtroDataFim);
      const response = await axios.get(`${API_URL}/api/auditoria/stats?${params.toString()}`);
      setStats(response.data);
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  const fetchModulos = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auditoria/modulos`);
      setModulosDisponiveis(response.data);
    } catch (error) {
      console.error("Erro ao buscar módulos:", error);
    }
  };

  const fetchUsuarios = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/users`);
      setUsuariosDisponiveis(response.data.map((u) => ({ userId: u.id, userName: u.name || u.username })));
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
    }
  };

  const fetchConfigs = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auditoria-config`);
      setConfigs(response.data);
      // Se não há configs, inicializa
      if (response.data.length === 0) {
        await axios.post(`${API_URL}/api/auditoria-config/init`);
        const updated = await axios.get(`${API_URL}/api/auditoria-config`);
        setConfigs(updated.data);
      }
    } catch (error) {
      console.error("Erro ao buscar configurações:", error);
    }
  };

  const handleToggleConfig = async (modulo, ativo) => {
    try {
      await axios.put(`${API_URL}/api/auditoria-config/${modulo}`, { ativo: !ativo });
      setConfigs((prev) => prev.map((c) => (c.modulo === modulo ? { ...c, ativo: !ativo } : c)));
    } catch (error) {
      console.error("Erro ao atualizar configuração:", error);
    }
  };

  const handleFiltrar = () => {
    setPage(1);
    fetchRegistros();
    fetchStats();
  };

  const handleLimparFiltros = () => {
    setFiltroModulo("");
    setFiltroAcao("");
    setFiltroUsuario("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setPage(1);
    setTimeout(() => {
      fetchRegistros();
      fetchStats();
    }, 100);
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return (
        <span className="date-cell">
          {format(date, "dd/MM/yyyy", { locale: ptBR })}{" "}
          <span className="time">{format(date, "HH:mm:ss")}</span>
        </span>
      );
    } catch {
      return dateStr;
    }
  };

  const getStatCount = (acao) => {
    if (!stats) return 0;
    const item = stats.porAcao.find((a) => a.acao === acao);
    return item ? item.count : 0;
  };

  return (
    <div className="auditoria-container">
      <h1>
        <FaClipboardList style={{ marginRight: 10, verticalAlign: "middle" }} />
        Auditoria do Sistema
      </h1>

      {/* Cards de Estatísticas */}
      <div className="auditoria-stats">
        <div className="stat-card total">
          <h3>Total de Registros</h3>
          <div className="stat-value">{stats?.totalRegistros || 0}</div>
        </div>
        <div className="stat-card post">
          <h3>Criações (POST)</h3>
          <div className="stat-value">{getStatCount("POST")}</div>
        </div>
        <div className="stat-card put">
          <h3>Alterações (PUT)</h3>
          <div className="stat-value">{getStatCount("PUT")}</div>
        </div>
        <div className="stat-card delete">
          <h3>Exclusões (DELETE)</h3>
          <div className="stat-value">{getStatCount("DELETE")}</div>
        </div>
      </div>

      {/* Configuração de Módulos Auditados */}
      <div className="auditoria-config-section">
        <h3 onClick={() => setShowConfig(!showConfig)}>
          <FaCog /> Configuração de Módulos Auditados
          {showConfig ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </h3>
        {showConfig && (
          <div className="config-grid">
            {configs.map((config) => (
              <div className="config-item" key={config.id}>
                <span>{config.modulo}</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={config.ativo}
                    onChange={() => handleToggleConfig(config.modulo, config.ativo)}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="auditoria-filters">
        <div className="filter-group">
          <label>Módulo</label>
          <select value={filtroModulo} onChange={(e) => setFiltroModulo(e.target.value)}>
            <option value="">Todos</option>
            {modulosDisponiveis.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Ação</label>
          <select value={filtroAcao} onChange={(e) => setFiltroAcao(e.target.value)}>
            <option value="">Todas</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Usuário</label>
          <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)}>
            <option value="">Todos</option>
            {usuariosDisponiveis.map((u) => (
              <option key={u.userId} value={u.userName}>
                {u.userName}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Data Início</label>
          <input
            type="date"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Data Fim</label>
          <input
            type="date"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <button className="btn-filter primary" onClick={handleFiltrar}>
            <FaSearch style={{ marginRight: 5 }} /> Filtrar
          </button>
          <button className="btn-filter secondary" onClick={handleLimparFiltros}>
            Limpar
          </button>
        </div>
      </div>

      {/* Tabela de Registros */}
      <div className="auditoria-table-container">
        {loading ? (
          <div className="auditoria-loading">
            <FaSpinner className="spinner" /> Carregando registros...
          </div>
        ) : registros.length === 0 ? (
          <div className="auditoria-empty">
            <div className="empty-icon">📋</div>
            <p>Nenhum registro de auditoria encontrado.</p>
          </div>
        ) : (
          <>
            <table className="auditoria-table">
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Módulo</th>
                  <th>Ação</th>
                  <th>Usuário</th>
                  <th>Rota</th>
                  <th>Descrição</th>
                  <th>Dados</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((reg) => (
                  <tr key={reg.id}>
                    <td>{formatDate(reg.createdAt)}</td>
                    <td>
                      <span className="badge-modulo">{reg.modulo}</span>
                    </td>
                    <td>
                      <span className={`badge-acao badge-${reg.acao}`}>{reg.acao}</span>
                    </td>
                    <td>{reg.userName || "—"}</td>
                    <td style={{ fontSize: 12, color: "#666" }}>{reg.rota}</td>
                    <td style={{ fontSize: 12 }}>{reg.descricao}</td>
                    <td className="payload-cell" title={reg.payload || ""}>
                      {reg.payload ? reg.payload.substring(0, 80) + (reg.payload.length > 80 ? "..." : "") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Paginação */}
            <div className="auditoria-pagination">
              <button className="btn-page" disabled={page <= 1} onClick={() => setPage(1)}>
                ««
              </button>
              <button className="btn-page" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                «
              </button>
              <span className="page-info">
                Página {page} de {totalPages} ({total} registros)
              </span>
              <button className="btn-page" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                »
              </button>
              <button className="btn-page" disabled={page >= totalPages} onClick={() => setPage(totalPages)}>
                »»
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Auditoria;

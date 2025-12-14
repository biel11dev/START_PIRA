import axios from "axios";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { addDays, addMonths, endOfYear, format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { FaSpinner } from "react-icons/fa";
import * as XLSX from "xlsx";
import "./Despesa.css";
import Message from "./Message";

const Despesa = () => {
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().substr(0, 10)); // Formato inicial da data
  const [isFixed, setIsFixed] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [editExpenseId, setEditExpenseId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDespesa, setEditDespesa] = useState("");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isLoading, setIsLoading] = useState(false); // Estado de carregamento
  const [isLoadingSave, setIsLoadingSave] = useState(false); // Estado de carregamento
  const [expenseOptions, setExpenseOptions] = useState([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isExpenseModalAdd, setIsExpenseModalAdd] = useState(false);
  const [newExpenseOption, setNewExpenseOption] = useState("");
  const [confirmAddOption, setConfirmAddOption] = useState(false);
  const [confirmDeleteOption, setConfirmDeleteOption] = useState({ show: false, id: null });
  const [expenseFilter, setExpenseFilter] = useState("");
  const [recentMovements, setRecentMovements] = useState([]);
  const [showAllMovements, setShowAllMovements] = useState(false);
  const [showMovementsModal, setShowMovementsModal] = useState(false);

  useEffect(() => {
    // Buscar despesas da API quando o componente for montado
    axios
      .get("https://api-start-pira.vercel.app/api/despesas")
      .then((response) => {
        setExpenses(response.data);
        console.log("Despesas carregadas:", response.data);
        // Todos os grupos começam ocultos - usuário escolhe o que expandir
        setExpandedGroups({});
      })
      .catch((error) => {
        console.error("Erro ao buscar despesas:", error);
      });
  }, []);

  useEffect(() => {
    axios
      .get("https://api-start-pira.vercel.app/api/cadastrodesp")
      .then((response) => setExpenseOptions(response.data))
      .catch((error) => console.error("Erro ao buscar tipos de despesas:", error));
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const addMovement = (type, expenseName, amount, description = "") => {
    const currentMonth = format(selectedMonth, "MM/yyyy");
    const movement = {
      id: Date.now(),
      type, // 'add' ou 'delete'
      expenseName,
      amount,
      description,
      timestamp: new Date(),
      month: currentMonth
    };
    
    setRecentMovements(prev => {
      const filtered = prev.filter(m => m.month === currentMonth);
      return [movement, ...filtered];
    });
  };

  const getFilteredMovements = () => {
    const currentMonth = format(selectedMonth, "MM/yyyy");
    return recentMovements.filter(m => m.month === currentMonth);
  };

  useEffect(() => {
    if (!isExpenseModalOpen) return;
    const handleClickOutside = (e) => {
      if (!e.target.closest(".custom-selectt")) {
        setIsExpenseModalOpen(false);
        setExpenseFilter("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isExpenseModalOpen]);

  const handleAddExpense = () => {
    if (newExpense.trim() !== "" && amount.trim() !== "") {
      setIsLoading(true); // Ativa o estado de carregamento
      const formattedDate = format(new Date(date), "yyyy-MM-dd HH:mm:ss"); // Formatar a data corretamente
      const newExpenseData = {
        nomeDespesa: newExpense,
        valorDespesa: parseFloat(amount),
        descDespesa: description.trim() !== "" ? description : null, // Permitir descrição nula
        date: formattedDate,
        DespesaFixa: isFixed,
      };

      console.log("Dados enviados:", newExpenseData); // Log dos dados enviados

      axios
        .post("https://api-start-pira.vercel.app/api/despesas", newExpenseData)
        .then((response) => {
          const updatedExpenses = [...expenses, response.data];
          setExpenses(updatedExpenses);
          
          // Registrar movimentação
          addMovement('add', newExpense, parseFloat(amount), description);
          
          // Nova despesa adicionada - grupo permanece oculto por padrão
          // Usuário pode expandir manualmente se desejar
          
          setNewExpense("");
          setAmount("");
          setDescription("");
          setDate(new Date().toISOString().substr(0, 10)); // Resetar a data para o formato inicial
          setIsFixed(false);
          setMessage({ show: true, text: "Despesa adicionada com sucesso!", type: "success" });
          console.log("Despesa adicionada:", response.data);
          setTimeout(() => {
            setMessage(null);
          }, 3000);

          // Se a despesa for fixa, criar registros para os meses restantes do ano
          if (isFixed) {
            const currentMonth = new Date(date);
            let nextMonth = addMonths(currentMonth, 1);
            const endOfYearDate = endOfYear(currentMonth);

            while (nextMonth <= endOfYearDate) {
              const secondDayOfNextMonth = addDays(startOfMonth(nextMonth), 1); // Definir a data como o segundo dia do mês
              const futureExpenseData = {
                nomeDespesa: newExpense,
                valorDespesa: 0, // Valor vazio
                descDespesa: null, // Descrição nula
                date: format(secondDayOfNextMonth, "yyyy-MM-dd HH:mm:ss"), // Definir a data como o segundo dia do mês com milissegundos
                DespesaFixa: isFixed,
              };

              axios
                .post("https://api-start-pira.vercel.app/api/despesas", futureExpenseData)
                .then((response) => {
                  setExpenses((prevExpenses) => [...prevExpenses, response.data]);
                })
                .catch((error) => {
                  console.error("Erro ao adicionar despesa futura:", error);
                });

              nextMonth = addMonths(nextMonth, 1);
            }
          }
        })
        .catch((error) => {
          setMessage({ show: true, text: "Erro ao adicionar despesa!", type: "error" });
          console.error("Erro ao adicionar despesa:", newExpenseData, error);
          setTimeout(() => {
            setMessage(null);
          }, 3000);
        })
        .finally(() => {
          setIsLoading(false); // Desativa o estado de carregamento
        });
    } else {
      setMessage({ show: true, text: "Preencha todos os campos obrigatórios!", type: "error" });
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    }
  };

  const handleAddExpenseOption = () => {
    if (newExpenseOption.trim() !== "" && !expenseOptions.some((opt) => opt.nomeDespesa === newExpenseOption)) {
      axios.post("https://api-start-pira.vercel.app/api/cadastrodesp", { nomeDespesa: newExpenseOption }).then((response) => {
        setExpenseOptions([...expenseOptions, response.data]);
        setNewExpenseOption("");
        setIsExpenseModalAdd(false);
        setMessage({ show: true, text: "Nova Despesa cadastrada com sucesso!", type: "success" });
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      });
    }
  };

  const handleDeleteExpenseOption = (id) => {
    axios.delete(`https://api-start-pira.vercel.app/api/cadastrodesp/${id}`).then(() => {
      setExpenseOptions(expenseOptions.filter((opt) => opt.id !== id));
      if (newExpense && expenseOptions.find((opt) => opt.id === id)?.nomeDespesa === newExpense) {
        setNewExpense("");
      }
    });
  };

  const handleEditExpense = (expense) => {
    // Fechar dropdown se estiver aberto
    setIsExpenseModalOpen(false);
    setExpenseFilter("");
    
    setEditDespesa(expense.nomeDespesa);
    setEditExpenseId(expense.id);
    setEditAmount(expense.valorDespesa);
    setEditDescription(expense.descDespesa || "");
  };

  const handleUpdateExpense = (id) => {
    setIsLoadingSave(true); // Ativa o estado de carregamento
    const updateNome = editDespesa.trim() !== "" && editDespesa !== expenses.find((expense) => expense.id === id)?.nomeDespesa ? editDespesa : null;
    const updatedAmount = parseFloat(editAmount) || 0;
    const updatedDescription = editDescription.trim() !== "" ? editDescription : null; // Permitir descrição nula

    axios
      .put(`https://api-start-pira.vercel.app/api/despesas/${id}`, {
        nomeDespesa: updateNome,
        valorDespesa: updatedAmount,
        descDespesa: updatedDescription,
      })
      .then((response) => {
        const updatedExpenses = expenses.map((expense) => (expense.id === id ? response.data : expense));
        setExpenses(updatedExpenses);
        setMessage({ show: true, text: "Despesa atualizada com sucesso!", type: "success" });
        setEditExpenseId(null);
        setEditAmount("");
        setEditDescription("");
        setEditDespesa("");
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      })
      .catch((error) => {
        setMessage({ show: true, text: "Erro ao atualizar despesa!", type: "error" });
        console.error("Erro ao atualizar despesa:", error);
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      })
      .finally(() => {
        setIsLoadingSave(false); // Desativa o estado de carregamento
      });
  };

  const handleDeleteExpense = (expenseId) => {
    // Fechar dropdown se estiver aberto
    setIsExpenseModalOpen(false);
    setExpenseFilter("");
    
    setConfirmDelete({ show: true, id: expenseId });
  };

  const confirmDeleteExpense = () => {
    const { id } = confirmDelete;
    const expenseToDelete = expenses.find(e => e.id === id);
    
    axios
      .delete(`https://api-start-pira.vercel.app/api/despesas/${id}`)
      .then(() => {
        setExpenses(expenses.filter((e) => e.id !== id));
        
        // Registrar movimentação
        if (expenseToDelete) {
          addMovement('delete', expenseToDelete.nomeDespesa, expenseToDelete.valorDespesa, expenseToDelete.descDespesa);
        }
        
        setConfirmDelete({ show: false, id: null });
        setMessage({ show: true, text: "Despesa excluída com sucesso!", type: "success" });
        console.log(`Despesa ${id} excluída com sucesso!`);
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      })
      .catch((error) => {
        setMessage({ show: true, text: "Erro ao excluir despesa!", type: "error" });
        console.error("Erro ao excluir despesa:", error);
        setTimeout(() => {
          setMessage(null);
        }, 3000);
      });
  };

  const cancelDeleteExpense = () => {
    setConfirmDelete({ show: false, id: null });
  };

  const handleMonthChange = (direction) => {
    setSelectedMonth((prevMonth) => (direction === "prev" ? addMonths(prevMonth, -1) : addMonths(prevMonth, 1)));
    // Resetar grupos expandidos ao mudar de mês - tudo volta a ficar oculto
    setExpandedGroups({});
  };

  const filteredExpenses = expenses.filter(
    (expense) => new Date(expense.date).getMonth() === selectedMonth.getMonth() && new Date(expense.date).getFullYear() === selectedMonth.getFullYear()
  );

  const handleExportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredExpenses.map((expense) => ({
        ID: expense.id,
        Despesa: expense.nomeDespesa,
        Valor: formatCurrency(expense.valorDespesa),
        Descrição: expense.descDespesa || "", // Exibir descrição vazia se for nula
        Data: new Date(expense.date).toLocaleDateString("pt-BR"),
        Fixa: expense.DespesaFixa ? "Sim" : "Não",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Despesas");
    XLSX.writeFile(workbook, "despesas.xlsx");
  };

  const groupExpensesByDescription = (expenses) => {
    return expenses.reduce((groups, expense) => {
      const key = expense.nomeDespesa || "Sem Descrição"; // Use "Sem Descrição" para despesas sem descrição
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(expense);
      return groups;
    }, {});
  };

  const toggleGroup = (description) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [description]: !prev[description],
    }));
  };

  // Substitua a parte do chartData por este código:
  const groupedExpenses = groupExpensesByDescription(filteredExpenses);

  // Criar array com os dados e ordenar por valor decrescente
  const sortedExpenseData = Object.entries(groupedExpenses)
    .map(([description, group]) => ({
      description,
      total: group.reduce((sum, expense) => sum + expense.valorDespesa, 0),
      group
    }))
    .sort((a, b) => b.total - a.total); // Ordenação decrescente (maior para menor)

  const chartData = {
    labels: sortedExpenseData.map(item => item.description),
    datasets: [
      {
        label: "Despesas",
        data: sortedExpenseData.map(item => item.total),
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        borderColor: "rgba(75, 192, 192, 1)",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        labels: {
          color: "white",
        },
      },
      datalabels: {
        display: false, // Desativa os rótulos no gráfico
      },
      tooltip: {
        enabled: true, // Mantém os valores visíveis ao passar o mouse
        callbacks: {
          label: (context) => {
            const value = context.raw;
            return `R$ ${value.toFixed(2).replace(".", ",")}`; // Formata o valor no tooltip
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "white",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.2)",
        },
      },
      y: {
        ticks: {
          color: "white",
        },
        grid: {
          color: "rgba(255, 255, 255, 0.2)",
        },
      },
    },
  };

  return (
    <div className="expense-list-container">
      <h2 className="desp">Lista de Despesas</h2>

      <div className="month-selector">
        <button className="but-mes" onClick={() => handleMonthChange("prev")}>
          Mês Anterior
        </button>
        <span>{format(selectedMonth, "MMMM yyyy", { locale: ptBR })}</span>
        <button className="but-prox-mes" onClick={() => handleMonthChange("next")}>
          Próximo Mês
        </button>
      </div>

      {/* Histórico de Movimentações */}
      <div className="movements-history" onClick={() => setShowMovementsModal(true)}>
        <div className="movements-header">
          <h3 className="movements-title">
            📊 Movimentações Recentes
          </h3>
          <span className="movements-count">
            {getFilteredMovements().length} {getFilteredMovements().length === 1 ? 'registro' : 'registros'}
          </span>
        </div>
        
        {getFilteredMovements().length > 0 ? (
          <div className="movements-list">
            {getFilteredMovements().slice(0, 5).map((movement) => (
              <div key={movement.id} className="movement-item">
                <div className="movement-info">
                  <div className="movement-name">
                    {movement.type === 'add' ? '➕' : '❌'} {movement.expenseName}
                  </div>
                  <div className="movement-timestamp">
                    {format(new Date(movement.timestamp), "dd/MM/yyyy 'às' HH:mm")}
                  </div>
                </div>
                <span className="movement-amount">
                  {formatCurrency(movement.amount)}
                </span>
              </div>
            ))}
            {getFilteredMovements().length > 5 && (
              <div className="movements-more">
                Clique para ver todos os registros
              </div>
            )}
          </div>
        ) : (
          <div className="movements-empty">
            Nenhuma movimentação neste mês
          </div>
        )}
      </div>

      {/* Modal de Movimentações */}
      {showMovementsModal && (
        <div className="movements-modal-overlay" onClick={() => setShowMovementsModal(false)}>
          <div className="movements-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="movements-modal-header">
              <h2 className="movements-modal-title">📊 Histórico de Movimentações</h2>
              <button className="movements-modal-close" onClick={() => setShowMovementsModal(false)}>
                ✕
              </button>
            </div>

            <div className="movements-modal-info">
              <span className="movements-modal-month">
                Mês: {format(selectedMonth, "MMMM yyyy", { locale: ptBR })} - Total: {getFilteredMovements().length} {getFilteredMovements().length === 1 ? 'registro' : 'registros'}
              </span>
            </div>

            {getFilteredMovements().length > 0 ? (
              <div>
                {getFilteredMovements().map((movement) => (
                  <div key={movement.id} className={`movement-detail-item ${movement.type}`}>
                    <div className="movement-detail-header">
                      <div className="movement-detail-left">
                        <div className="movement-detail-type">
                          <span className="movement-detail-icon">
                            {movement.type === 'add' ? '➕' : '❌'}
                          </span>
                          <span className={`movement-detail-label ${movement.type}`}>
                            {movement.type === 'add' ? 'INCLUSÃO' : 'EXCLUSÃO'}
                          </span>
                        </div>
                        <div className="movement-detail-name">
                          {movement.expenseName}
                        </div>
                        {movement.description && (
                          <div className="movement-detail-description">
                            📝 {movement.description}
                          </div>
                        )}
                        <div className="movement-detail-time">
                          🕐 {format(new Date(movement.timestamp), "dd/MM/yyyy 'às' HH:mm:ss")}
                        </div>
                      </div>
                      <div className={`movement-detail-amount ${movement.type}`}>
                        {movement.type === 'add' ? '+' : '-'} {formatCurrency(movement.amount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="movements-empty-state">
                <div className="movements-empty-icon">📭</div>
                <p className="movements-empty-text">Nenhuma movimentação registrada neste mês</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className="input-group-desp"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleAddExpense(); // Chama a função ao pressionar Enter
          }
        }}
      >
        {isExpenseModalAdd && (
          <div className="modal">
            <div className="modal-content">
              <h3 className="texto-add-unidade">Adicionar Nova Despesa</h3>
              <input className="texto-unidade" type="text" value={newExpenseOption} onChange={(e) => setNewExpenseOption(e.target.value)} placeholder="Digite a nova despesa" />
              <div className="modal-buttons">
                <button onClick={handleAddExpenseOption}>Confirmar</button>
                <button onClick={() => setIsExpenseModalAdd(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        <div className="custom-selectt">
          <div className="selected-unitt" onClick={() => setIsExpenseModalOpen((prev) => !prev)} tabIndex={0} style={{ cursor: "pointer" }}>
            {newExpense || <span style={{ marginTop: "-6px", display: "inline-block", textShadow: "none" }}>Selecione a despesa</span>}
          </div>
          {isExpenseModalOpen && (
            <ul className="unit-dropdown">
              <li>
                <input
                  type="text"
                  className="expense-filter-input"
                  placeholder="Filtrar despesas..."
                  value={expenseFilter}
                  onChange={(e) => setExpenseFilter(e.target.value)}
                  autoFocus
                />
              </li>
              {expenseOptions
                .filter((option) => option.nomeDespesa.toLowerCase().includes(expenseFilter.toLowerCase()))
                .map((option) => (
                  <li key={option.id} className="unit-item">
                    <span
                      className="unit-name"
                      onClick={() => {
                        setNewExpense(option.nomeDespesa);
                        setIsExpenseModalOpen(false);
                        setExpenseFilter(""); // Limpa filtro ao selecionar
                      }}
                    >
                      {option.nomeDespesa}
                    </span>
                    <button className="delete-unit-button" onClick={() => setConfirmDeleteOption({ show: true, id: option.id })} title="Excluir despesa" disabled={isLoading}>
                      🗑️
                    </button>
                  </li>
                ))}
              <li className="add-unit-option" onClick={() => setIsExpenseModalAdd(true)}>
                + Adicionar nova unidade
              </li>
            </ul>
          )}
        </div>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor (R$)" />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <select value={isFixed} onChange={(e) => setIsFixed(e.target.value === "true")}>
          <option value="false">Variável</option>
          <option value="true">Fixa</option>
        </select>
        <button className="save-buttonn" onClick={handleAddExpense} disabled={isLoading}>
          {isLoading ? <FaSpinner className="loading-iconnn" /> : "Adicionar Despesa"}
        </button>
      </div>

      {/* Header da lista de despesas */}
      <div className="expense-list-header">
        <span className="header-name">Nome da Despesa</span>
        <span className="header-date">Data</span>
        <span className="header-description">Descrição</span>
        <span className="header-amount">Valor</span>
        <span className="header-actions">Ações</span>
      </div>

      <ul className="expense-list">
        {Object.entries(groupedExpenses)
          .sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
          .map(([description, group]) => (
          <li key={description} className="expense-group">
            <div className="group-header" onClick={() => toggleGroup(description)}>
              <span>{description}</span>
              <span>Total: {formatCurrency(group.reduce((sum, expense) => sum + expense.valorDespesa, 0))}</span>
              <button className="botao-expend">{expandedGroups[description] ? "Ocultar" : "Expandir"}</button>
            </div>
            {expandedGroups[description] && (
              <ul className="group-details">
                {group.map((expense) => (
                  <li key={expense.id} className="expense-item-desp">
                    {editExpenseId === expense.id ? (
                      // Renderiza os campos de edição
                      <div className="edit-expense">
                        <div className="input-group-desc">
                          <label htmlFor={`edit-amount-${expense.id}`}>Nome Despesa</label>
                          <input
                            id={`edit-amount-${expense.id}`}
                            type="text"
                            value={editDespesa}
                            onChange={(e) => setEditDespesa(e.target.value)}
                            placeholder="Novo nome"
                            className="edit-input-nome"
                          />
                        </div>
                        <div className="input-group-desc">
                          <label htmlFor={`edit-amount-${expense.id}`}>Valor</label>
                          <input
                            id={`edit-amount-${expense.id}`}
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            placeholder="Novo valor"
                            className="edit-input-val"
                          />
                        </div>
                        <div className="input-group-desc">
                          <label htmlFor={`edit-description-${expense.id}`}>Descrição</label>
                          <input
                            id={`edit-description-${expense.id}`}
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Nova descrição"
                            className="edit-input-desc"
                          />
                        </div>
                        <button onClick={() => handleUpdateExpense(expense.id)} className="update-button" disabled={isLoadingSave}>
                          {isLoadingSave ? <FaSpinner className="loading-iconnn" /> : "Salvar"}
                        </button>
                        <button onClick={() => setEditExpenseId(null)} className="cancel-button">
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      // Renderiza os dados normais da despesa com layout grid
                      <div className="expense-info">
                        <span className="expense-name">{expense.nomeDespesa}</span>
                        <span className="expense-date">{format(addDays(parseISO(expense.date), 1), "dd/MM/yyyy", { locale: ptBR })}</span>
                        <span className="expense-description">{expense.descDespesa || "Sem descrição"}</span>
                        <span className="expense-amount">{formatCurrency(expense.valorDespesa)}</span>
                        <div className="expense-actions">
                          <button onClick={() => handleEditExpense(expense)} className="edit-button">
                            Editar
                          </button>
                          <button onClick={() => handleDeleteExpense(expense.id)} className="delete-button">
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

      <button onClick={handleExportToExcel} className="export-button">
        Exportar para Excel
      </button>

      <div className="container-desp">
        <Bar data={chartData} options={chartOptions} plugins={[ChartDataLabels]} />
      </div>

      <div className="total-expenses">
        <span>Total de Despesas do Mês: </span>
        <span>{formatCurrency(filteredExpenses.reduce((sum, expense) => sum + expense.valorDespesa, 0))}</span>
      </div>

      {confirmDelete.show && <Message message="Tem certeza que deseja excluir esta despesa?" type="warning" onClose={cancelDeleteExpense} onConfirm={confirmDeleteExpense} />}

      {message && <Message message={message.text} type={message.type} onClose={() => setMessage(null)} />}

      {confirmAddOption && (
        <Message
          message="Deseja realmente adicionar esta despesa?"
          type="warning"
          onClose={() => setConfirmAddOption(false)}
          onConfirm={() => {
            handleAddExpenseOption();
            setConfirmAddOption(false);
          }}
        />
      )}

      {confirmDeleteOption.show && (
        <Message
          message="Deseja realmente excluir esta despesa?"
          type="warning"
          onClose={() => setConfirmDeleteOption({ show: false, id: null })}
          onConfirm={() => {
            handleDeleteExpenseOption(confirmDeleteOption.id);
            setConfirmDeleteOption({ show: false, id: null });
          }}
        />
      )}
    </div>
  );
};

export default Despesa;
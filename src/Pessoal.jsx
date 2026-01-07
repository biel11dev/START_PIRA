import axios from "axios";
import ChartDataLabels from "chartjs-plugin-datalabels";
import { addDays, addMonths, endOfYear, format, parseISO, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { FaSpinner } from "react-icons/fa";
import * as XLSX from "xlsx";
import "./Pessoal.css";
import Message from "./Message";

const Pessoal = () => {
  const [expenses, setExpenses] = useState([]);
  const [newExpense, setNewExpense] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().substr(0, 10));
  const [isFixed, setIsFixed] = useState(false);
  const [tipoMovimento, setTipoMovimento] = useState("GASTO");
  const [isVale, setIsVale] = useState(false);
  const [message, setMessage] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [editExpenseId, setEditExpenseId] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDespesa, setEditDespesa] = useState("");
  const [editTipoMovimento, setEditTipoMovimento] = useState("GASTO");
  const [expandedGroups, setExpandedGroups] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSave, setIsLoadingSave] = useState(false);
  const [viewFilter, setViewFilter] = useState("TODOS"); // TODOS, GASTOS_FIXOS, GASTOS_VARIAVEIS, GANHOS
  
  // Estados para o gráfico interativo
  const [chartMode, setChartMode] = useState("overview"); // "overview", "detailed" ou "micro"
  const [selectedChartType, setSelectedChartType] = useState(null); // "GASTO" ou "GANHO"
  const [selectedChartCategory, setSelectedChartCategory] = useState(null); // Categoria selecionada para modo micro
  
  // Estados para modal de período fixo
  const [showFixedPeriodModal, setShowFixedPeriodModal] = useState(false);
  const [fixedPeriodMonths, setFixedPeriodMonths] = useState(12);
  
  // Estados para modal de seleção de despesa fixa existente
  const [showFixedExpenseSelectionModal, setShowFixedExpenseSelectionModal] = useState(false);
  const [existingFixedExpenses, setExistingFixedExpenses] = useState([]);
  const [selectedExistingExpense, setSelectedExistingExpense] = useState(null);
  const [isEditingFixedExpense, setIsEditingFixedExpense] = useState(false);
  
  // Estados para autocomplete de despesas variáveis
  const [variableExpenseSuggestions, setVariableExpenseSuggestions] = useState([]);
  const [showVariableSuggestions, setShowVariableSuggestions] = useState(false);
  
  // Estados para categorias
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCategoryModalAdd, setIsCategoryModalAdd] = useState(false);
  const [isCategoryModalEdit, setIsCategoryModalEdit] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [confirmDeleteCategory, setConfirmDeleteCategory] = useState({ show: false, id: null });
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  };

  const groupExpensesByDescription = (expenses) => {
    return expenses.reduce((groups, expense) => {
      const key = expense.nomeDespesa || "Sem Descrição";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(expense);
      return groups;
    }, {});
  };

  useEffect(() => {
    // Buscar despesas pessoais da API
    axios
      .get("https://api-start-pira.vercel.app/api/desp-pessoal")
      .then((response) => {
        setExpenses(response.data);
        console.log("Despesas pessoais carregadas:", response.data);
        // Todos os grupos começam ocultos - usuário escolhe o que expandir
        setExpandedGroups({});
      })
      .catch((error) => {
        console.error("Erro ao buscar despesas pessoais:", error);
      });
  }, []);

  useEffect(() => {
    // Buscar categorias da API
    axios
      .get("https://api-start-pira.vercel.app/api/cat-desp-pessoal")
      .then((response) => {
        setCategories(response.data);
        console.log("Categorias carregadas:", response.data);
      })
      .catch((error) => {
        console.error("Erro ao buscar categorias:", error);
      });
  }, []);

  useEffect(() => {
    if (!isCategoryModalOpen) return;
    const handleClickOutside = (e) => {
      // Verificar se o clique foi fora da área do dropdown
      if (!e.target.closest(".pessoal-category-select") && !e.target.closest(".pessoal-modal")) {
        setIsCategoryModalOpen(false);
        setCategoryFilter("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCategoryModalOpen]);

  // Função para buscar despesas fixas existentes do mês
  const fetchExistingFixedExpenses = () => {
    const fixedExpenses = expenses.filter(expense => {
      const expenseDate = addDays(parseISO(expense.date), 1);
      return expenseDate.getMonth() === selectedMonth.getMonth() && 
             expenseDate.getFullYear() === selectedMonth.getFullYear() &&
             expense.DespesaFixa === true;
    });
    setExistingFixedExpenses(fixedExpenses);
    setShowFixedExpenseSelectionModal(true);
  };

  // Função para selecionar despesa fixa existente para ATUALIZAÇÃO
  const handleSelectExistingFixedExpense = async (expense) => {
    // Preencher formulário com dados da despesa
    setNewExpense(expense.nomeDespesa);
    setAmount(expense.valorDespesa.toString());
    setDescription(expense.descDespesa || "");
    setSelectedCategory(expense.categoriaId?.toString() || "");
    setTipoMovimento(expense.tipoMovimento);
    setIsVale(expense.isVale || false);
    
    // Converter data do formato do banco para formato do input (YYYY-MM-DD)
    const expenseDate = parseISO(expense.date);
    const formattedDate = format(expenseDate, "yyyy-MM-dd");
    setDate(formattedDate);
    
    setSelectedExistingExpense(expense);
    setIsEditingFixedExpense(true);
    setIsFixed(true);
    setShowFixedExpenseSelectionModal(false);
  };

  // Função para criar nova despesa fixa
  const handleCreateNewFixedExpense = () => {
    setShowFixedExpenseSelectionModal(false);
    setIsEditingFixedExpense(false);
    setSelectedExistingExpense(null);
    setShowFixedPeriodModal(true);
  };

  // Função para buscar sugestões de despesas variáveis
  const getVariableExpenseSuggestions = (searchTerm) => {
    if (!searchTerm || searchTerm.length < 2) {
      setVariableExpenseSuggestions([]);
      setShowVariableSuggestions(false);
      return;
    }

    // Buscar despesas variáveis e filtrar por nome
    const variableExpenses = expenses
      .filter(expense => 
        expense.DespesaFixa === false && 
        expense.nomeDespesa.toLowerCase().includes(searchTerm.toLowerCase())
      );
    
    // Criar combinação única de nome+tipo+valor para mostrar variações
    const uniqueExpenses = [];
    const seenCombinations = new Set();
    
    for (const expense of variableExpenses) {
      // Criar chave única baseada em nome, tipo e valor
      const key = `${expense.nomeDespesa}|${expense.tipoMovimento}|${expense.valorDespesa}`;
      if (!seenCombinations.has(key)) {
        seenCombinations.add(key);
        uniqueExpenses.push(expense);
      }
    }
    
    const filtered = uniqueExpenses.slice(0, 10);
    
    setVariableExpenseSuggestions(filtered);
    setShowVariableSuggestions(filtered.length > 0);
  };

  // Função para selecionar sugestão de despesa variável
  const handleSelectVariableSuggestion = (expense) => {
    setNewExpense(expense.nomeDespesa);
    setAmount(expense.valorDespesa.toString());
    setDescription(expense.descDespesa || "");
    setSelectedCategory(expense.categoriaId?.toString() || "");
    setTipoMovimento(expense.tipoMovimento);
    setIsVale(expense.isVale || false);
    setShowVariableSuggestions(false);
  };

  const handleAddExpense = () => {
    if (newExpense.trim() !== "" && amount.trim() !== "") {
      setIsLoading(true);
      const formattedDate = format(new Date(date), "yyyy-MM-dd HH:mm:ss");
      const categoryId = selectedCategory ? parseInt(selectedCategory) : null;
      
      // Se estiver editando uma despesa fixa existente, ATUALIZAR em vez de criar
      if (isEditingFixedExpense && selectedExistingExpense) {
        const updatedData = {
          nomeDespesa: newExpense.trim(),
          valorDespesa: parseFloat(amount),
          descDespesa: description.trim() !== "" ? description.trim() : null,
          date: formattedDate,
          DespesaFixa: isFixed,
          tipoMovimento,
          categoriaId: categoryId,
          isVale: isVale,
        };

        axios
          .put(`https://api-start-pira.vercel.app/api/desp-pessoal/${selectedExistingExpense.id}`, updatedData)
          .then((response) => {
            setExpenses((prev) => prev.map((exp) => (exp.id === selectedExistingExpense.id ? response.data : exp)));
            const gastoId = response.data.id;
            
            // Se for GASTO e tiver VALE marcado, criar registro de VALE como GANHO
            if (tipoMovimento === "GASTO" && isVale) {
              const valeData = {
                nomeDespesa: "VALE",
                valorDespesa: parseFloat(amount),
                descDespesa: `Vale referente a: ${newExpense.trim()}`,
                date: formattedDate,
                DespesaFixa: false,
                tipoMovimento: "GANHO",
                categoriaId: categoryId,
                valeRelacionadoId: gastoId,
                isVale: true,
              };
              
              axios
                .post("https://api-start-pira.vercel.app/api/desp-pessoal", valeData)
                .then((valeResponse) => {
                  setExpenses((prevExpenses) => [...prevExpenses, valeResponse.data]);
                  console.log("VALE adicionado automaticamente:", valeResponse.data);
                  
                  // Atualizar o GASTO com o ID do VALE relacionado
                  axios
                    .put(`https://api-start-pira.vercel.app/api/desp-pessoal/${gastoId}`, {
                      valeRelacionadoId: valeResponse.data.id,
                    })
                    .then(() => {
                      // Atualizar estado local com a relação
                      setExpenses((prevExpenses) =>
                        prevExpenses.map((exp) =>
                          exp.id === gastoId ? { ...exp, valeRelacionadoId: valeResponse.data.id } : exp
                        )
                      );
                    })
                    .catch((error) => {
                      console.error("Erro ao atualizar valeRelacionadoId:", error);
                    });
                })
                .catch((error) => {
                  console.error("Erro ao adicionar VALE:", error);
                });
            }
            
            setMessage({ show: true, text: isVale ? "Despesa fixa atualizada e VALE adicionado com sucesso!" : "Despesa fixa atualizada com sucesso!", type: "success" });
            setTimeout(() => setMessage(null), 3000);
            
            // Limpar formulário
            setNewExpense("");
            setAmount("");
            setDescription("");
            setDate(new Date().toISOString().substr(0, 10));
            setIsFixed(false);
            setTipoMovimento("GASTO");
            setIsVale(false);
            setSelectedCategory("");
            setIsEditingFixedExpense(false);
            setSelectedExistingExpense(null);
          })
          .catch((error) => {
            console.error("Erro ao atualizar despesa fixa:", error);
            setMessage({ show: true, text: "Erro ao atualizar despesa fixa!", type: "error" });
            setTimeout(() => setMessage(null), 3000);
          })
          .finally(() => {
            setIsLoading(false);
          });
        return;
      }
      
      const newExpenseData = {
        nomeDespesa: newExpense.trim(),
        valorDespesa: parseFloat(amount),
        descDespesa: description.trim() !== "" ? description.trim() : null,
        date: formattedDate,
        DespesaFixa: isFixed,
        tipoMovimento,
        categoriaId: categoryId,
        isVale: isVale,
      };

      console.log("Dados enviados:", newExpenseData);

      axios
        .post("https://api-start-pira.vercel.app/api/desp-pessoal", newExpenseData)
        .then((response) => {
          let updatedExpenses = [...expenses, response.data];
          setExpenses(updatedExpenses);
          const gastoId = response.data.id;
          
          // Se for GASTO e tiver VALE marcado, criar registro de VALE como GANHO
          if (tipoMovimento === "GASTO" && isVale) {
            const valeData = {
              nomeDespesa: "VALE",
              valorDespesa: parseFloat(amount),
              descDespesa: `Vale referente a: ${newExpense}`,
              date: formattedDate,
              DespesaFixa: false,
              tipoMovimento: "GANHO",
              categoriaId: categoryId,
              valeRelacionadoId: gastoId, // Relacionar VALE ao GASTO
            };
            
            axios
              .post("https://api-start-pira.vercel.app/api/desp-pessoal", valeData)
              .then((valeResponse) => {
                setExpenses((prevExpenses) => [...prevExpenses, valeResponse.data]);
                console.log("VALE adicionado automaticamente:", valeResponse.data);
                
                // Atualizar o GASTO com o ID do VALE relacionado
                axios
                  .put(`https://api-start-pira.vercel.app/api/desp-pessoal/${gastoId}`, {
                    valeRelacionadoId: valeResponse.data.id,
                  })
                  .then(() => {
                    // Atualizar estado local com a relação
                    setExpenses((prevExpenses) =>
                      prevExpenses.map((exp) =>
                        exp.id === gastoId ? { ...exp, valeRelacionadoId: valeResponse.data.id } : exp
                      )
                    );
                  })
                  .catch((error) => {
                    console.error("Erro ao atualizar valeRelacionadoId:", error);
                  });
              })
              .catch((error) => {
                console.error("Erro ao adicionar VALE:", error);
              });
          }
          
          // Nova despesa adicionada - grupo permanece oculto por padrão
          // Usuário pode expandir manualmente se desejar
          
          setNewExpense("");
          setAmount("");
          setDescription("");
          setDate(new Date().toISOString().substr(0, 10));
          setIsFixed(false);
          setTipoMovimento("GASTO");
          setIsVale(false);
          setSelectedCategory("");
          setMessage({ show: true, text: isVale ? "Despesa e VALE adicionados com sucesso!" : "Despesa pessoal adicionada com sucesso!", type: "success" });
          console.log("Despesa pessoal adicionada:", response.data);
          setTimeout(() => setMessage(null), 3000);

          // Se a despesa for fixa, criar registros para os próximos meses baseado no período escolhido
          if (isFixed) {
            const currentMonth = new Date(date);
            let nextMonth = addMonths(currentMonth, 1);
            let monthsCreated = 0;

            while (monthsCreated < fixedPeriodMonths) {
              const secondDayOfNextMonth = addDays(startOfMonth(nextMonth), 1);
              const futureExpenseData = {
                nomeDespesa: newExpense,
                valorDespesa: parseFloat(amount),
                descDespesa: description.trim() !== "" ? description : null,
                date: format(secondDayOfNextMonth, "yyyy-MM-dd HH:mm:ss"),
                DespesaFixa: isFixed,
                tipoMovimento,
                categoriaId: categoryId,
              };

              axios
                .post("https://api-start-pira.vercel.app/api/desp-pessoal", futureExpenseData)
                .then((response) => {
                  setExpenses((prevExpenses) => [...prevExpenses, response.data]);
                })
                .catch((error) => {
                  console.error("Erro ao adicionar despesa futura:", error);
                });

              nextMonth = addMonths(nextMonth, 1);
              monthsCreated++;
            }
            
            // Resetar o período para o padrão
            setFixedPeriodMonths(12);
          }
        })
        .catch((error) => {
          setMessage({ show: true, text: "Erro ao adicionar despesa pessoal!", type: "error" });
          console.error("Erro ao adicionar despesa pessoal:", newExpenseData, error);
          setTimeout(() => setMessage(null), 3000);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setMessage({ show: true, text: "Preencha todos os campos obrigatórios!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleAddCategory = () => {
    if (newCategory.trim() !== "" && !categories.some((cat) => cat.nomeCategoria === newCategory)) {
      setIsLoading(true);
      axios
        .post("https://api-start-pira.vercel.app/api/cat-desp-pessoal", { nomeCategoria: newCategory })
        .then((response) => {
          setCategories([...categories, response.data]);
          setNewCategory("");
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
      .delete(`https://api-start-pira.vercel.app/api/cat-desp-pessoal/${id}`)
      .then(() => {
        setCategories(categories.filter((cat) => cat.id !== id));
        setConfirmDeleteCategory({ show: false, id: null });
        setMessage({ show: true, text: "Categoria excluída com sucesso!", type: "success" });
        setTimeout(() => setMessage(null), 3000);
      })
      .catch((error) => {
        setMessage({ show: true, text: "Erro ao excluir categoria!", type: "error" });
        setTimeout(() => setMessage(null), 3000);
      });
  };

  const handleEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.nomeCategoria);
    setIsCategoryModalEdit(true);
    setIsCategoryModalOpen(false);
  };

  const handleUpdateCategory = () => {
    if (editingCategoryName.trim() !== "" && !categories.some((cat) => cat.nomeCategoria === editingCategoryName && cat.id !== editingCategoryId)) {
      setIsLoading(true);
      axios
        .put(`https://api-start-pira.vercel.app/api/cat-desp-pessoal/${editingCategoryId}`, { 
          nomeCategoria: editingCategoryName 
        })
        .then((response) => {
          setCategories(categories.map(cat => 
            cat.id === editingCategoryId 
              ? { ...cat, nomeCategoria: editingCategoryName }
              : cat
          ));
          setEditingCategoryId(null);
          setEditingCategoryName("");
          setIsCategoryModalEdit(false);
          setMessage({ show: true, text: "Categoria atualizada com sucesso!", type: "success" });
          setTimeout(() => setMessage(null), 3000);
        })
        .catch((error) => {
          setMessage({ show: true, text: "Erro ao atualizar categoria!", type: "error" });
          setTimeout(() => setMessage(null), 3000);
        })
        .finally(() => setIsLoading(false));
    } else {
      setMessage({ show: true, text: "Nome inválido ou já existe!", type: "error" });
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleEditExpense = (expense) => {
    // Fechar dropdown se estiver aberto
    setIsCategoryModalOpen(false);
    setCategoryFilter("");
    
    setEditDespesa(expense.nomeDespesa);
    setEditExpenseId(expense.id);
    setEditAmount(expense.valorDespesa);
    setEditDescription(expense.descDespesa || "");
    setEditTipoMovimento(expense.tipoMovimento || "GASTO");
    setEditCategoryId(expense.categoriaId || "");
  };

  const handleUpdateExpense = (id) => {
    setIsLoadingSave(true);
    const updatedNome = editDespesa.trim() !== "" ? editDespesa : null;
    const updatedAmount = parseFloat(editAmount) || 0;
    const updatedDescription = editDescription.trim() !== "" ? editDescription : null;
    const categoryId = editCategoryId ? parseInt(editCategoryId) : null;

    console.log("Dados para atualização:", {
      nomeDespesa: updatedNome,
      valorDespesa: updatedAmount,
      descDespesa: updatedDescription,
      tipoMovimento: editTipoMovimento,
      categoriaId: categoryId,
    });

    axios
      .put(`https://api-start-pira.vercel.app/api/desp-pessoal/${id}`, {
        nomeDespesa: updatedNome,
        valorDespesa: updatedAmount,
        descDespesa: updatedDescription,
        tipoMovimento: editTipoMovimento,
        categoriaId: categoryId,
      })
      .then((response) => {
        console.log("Resposta da API:", response.data);
        const updatedExpenses = expenses.map((expense) => (expense.id === id ? response.data : expense));
        setExpenses(updatedExpenses);
        setMessage({ show: true, text: "Despesa pessoal atualizada com sucesso!", type: "success" });
        setEditExpenseId(null);
        setEditAmount("");
        setEditDescription("");
        setEditDespesa("");
        setEditTipoMovimento("GASTO");
        setEditCategoryId("");
        setTimeout(() => setMessage(null), 3000);
      })
      .catch((error) => {
        console.error("Erro detalhado ao atualizar despesa pessoal:", error);
        console.error("Response data:", error.response?.data);
        console.error("Response status:", error.response?.status);
        
        let errorMessage = "Erro ao atualizar despesa pessoal!";
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = `Erro: ${error.message}`;
        }
        
        setMessage({ show: true, text: errorMessage, type: "error" });
        setTimeout(() => setMessage(null), 5000);
      })
      .finally(() => {
        setIsLoadingSave(false);
      });
  };

  const handleDeleteExpense = (expenseId) => {
    // Fechar dropdown se estiver aberto
    setIsCategoryModalOpen(false);
    setCategoryFilter("");
    
    setConfirmDelete({ show: true, id: expenseId });
  };

  const confirmDeleteExpense = () => {
    const { id } = confirmDelete;
    const expenseToDelete = expenses.find((e) => e.id === id);
    const relatedId = expenseToDelete?.valeRelacionadoId;
    
    // Primeiro, excluir o registro principal
    axios
      .delete(`https://api-start-pira.vercel.app/api/desp-pessoal/${id}`)
      .then(() => {
        // Se existir um registro relacionado, excluí-lo também
        if (relatedId) {
          axios
            .delete(`https://api-start-pira.vercel.app/api/desp-pessoal/${relatedId}`)
            .then(() => {
              // Remover ambos os registros do estado
              setExpenses(expenses.filter((e) => e.id !== id && e.id !== relatedId));
              setConfirmDelete({ show: false, id: null });
              setMessage({ show: true, text: "Despesa e VALE relacionado excluídos com sucesso!", type: "success" });
              console.log(`Despesa ${id} e VALE ${relatedId} excluídos com sucesso!`);
              setTimeout(() => setMessage(null), 3000);
            })
            .catch((error) => {
              console.error("Erro ao excluir VALE relacionado:", error);
              // Mesmo se falhar a exclusão do VALE, removemos o GASTO do estado
              setExpenses(expenses.filter((e) => e.id !== id));
              setConfirmDelete({ show: false, id: null });
              setMessage({ show: true, text: "Despesa excluída, mas erro ao excluir VALE relacionado!", type: "warning" });
              setTimeout(() => setMessage(null), 3000);
            });
        } else {
          // Sem registro relacionado, apenas remover o registro principal
          setExpenses(expenses.filter((e) => e.id !== id));
          setConfirmDelete({ show: false, id: null });
          setMessage({ show: true, text: "Despesa pessoal excluída com sucesso!", type: "success" });
          console.log(`Despesa pessoal ${id} excluída com sucesso!`);
          setTimeout(() => setMessage(null), 3000);
        }
      })
      .catch((error) => {
        setMessage({ show: true, text: "Erro ao excluir despesa pessoal!", type: "error" });
        console.error("Erro ao excluir despesa pessoal:", error);
        setTimeout(() => setMessage(null), 3000);
      });
  };

  const cancelDeleteExpense = () => {
    setConfirmDelete({ show: false, id: null });
  };

  const handleMonthChange = (direction) => {
    setSelectedMonth((prevMonth) => (direction === "prev" ? addMonths(prevMonth, -1) : addMonths(prevMonth, 1)));
    // Resetar grupos expandidos ao mudar de mês - tudo volta a ficar oculto
    setExpandedGroups({});
    // Resetar gráfico para visão geral ao mudar de mês
    setChartMode("overview");
    setSelectedChartType(null);
    setSelectedChartCategory(null);
  };

  const filteredExpenses = expenses.filter(
    (expense) => {
      const expenseDate = addDays(parseISO(expense.date), 1);
      const dateMatch = expenseDate.getMonth() === selectedMonth.getMonth() && expenseDate.getFullYear() === selectedMonth.getFullYear();
      
      // Filtro de pesquisa por nome, descrição ou categoria
      const searchMatch = searchTerm.trim() === "" || 
        expense.nomeDespesa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.descDespesa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.categoria?.nomeCategoria?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (viewFilter === "TODOS") {
        return dateMatch && searchMatch;
      }
      if (viewFilter === "GASTOS_FIXOS") {
        return dateMatch && searchMatch && expense.tipoMovimento === "GASTO" && expense.DespesaFixa === true;
      }
      if (viewFilter === "GASTOS_VARIAVEIS") {
        return dateMatch && searchMatch && expense.tipoMovimento === "GASTO" && expense.DespesaFixa === false;
      }
      if (viewFilter === "GANHOS") {
        return dateMatch && searchMatch && expense.tipoMovimento === "GANHO";
      }
      return dateMatch && searchMatch;
    }
  );

  const handleExportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredExpenses.map((expense) => ({
        ID: expense.id,
        Despesa: expense.nomeDespesa,
        Valor: formatCurrency(expense.valorDespesa),
        Descrição: expense.descDespesa || "",
        Categoria: expense.categoria?.nomeCategoria || "Sem categoria",
        Tipo: expense.tipoMovimento === "GASTO" ? "Gasto" : "Ganho",
        Data: format(addDays(parseISO(expense.date), 1), "dd/MM/yyyy", { locale: ptBR }),
        Fixa: expense.DespesaFixa ? "Sim" : "Não",
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Despesas Pessoais");
    XLSX.writeFile(workbook, "despesas-pessoais.xlsx");
  };

  const toggleGroup = (description) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [description]: !prev[description],
    }));
  };

  const groupedExpenses = groupExpensesByDescription(filteredExpenses);

  // Separar gastos e ganhos para o gráfico e contadores
  const allGastos = expenses.filter(expense => {
    const expenseDate = addDays(parseISO(expense.date), 1);
    return expenseDate.getMonth() === selectedMonth.getMonth() && 
           expenseDate.getFullYear() === selectedMonth.getFullYear() &&
           expense.tipoMovimento === "GASTO";
  });
  
  const allGanhos = expenses.filter(expense => {
    const expenseDate = addDays(parseISO(expense.date), 1);
    return expenseDate.getMonth() === selectedMonth.getMonth() && 
           expenseDate.getFullYear() === selectedMonth.getFullYear() &&
           expense.tipoMovimento === "GANHO";
  });

  const gastos = filteredExpenses.filter(expense => expense.tipoMovimento === "GASTO");
  const ganhos = filteredExpenses.filter(expense => expense.tipoMovimento === "GANHO");

  const chartData = {
    labels: ["Gastos", "Ganhos"],
    datasets: [
      {
        label: "Valores",
        data: [
          gastos.reduce((sum, expense) => sum + expense.valorDespesa, 0),
          ganhos.reduce((sum, expense) => sum + expense.valorDespesa, 0)
        ],
        backgroundColor: ["rgba(255, 99, 132, 0.2)", "rgba(75, 192, 192, 0.2)"],
        borderColor: ["rgba(255, 99, 132, 1)", "rgba(75, 192, 192, 1)"],
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
        display: false,
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: (context) => {
            const value = context.raw;
            return `R$ ${value.toFixed(2).replace(".", ",")}`;
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

  // Função para processar dados por categoria
  const getDataByCategory = (tipo) => {
    const expensesByType = filteredExpenses.filter(expense => expense.tipoMovimento === tipo);
    const categoryData = {};
    
    expensesByType.forEach(expense => {
      const categoryName = expense.categoria?.nomeCategoria || "Sem categoria";
      if (!categoryData[categoryName]) {
        categoryData[categoryName] = 0;
      }
      categoryData[categoryName] += expense.valorDespesa;
    });
    
    return categoryData;
  };

  // Handler para clique nas barras do gráfico
  const handleChartClick = (event, elements) => {
    if (elements.length > 0 && chartMode === "overview") {
      const clickedIndex = elements[0].index;
      const clickedType = clickedIndex === 0 ? "GASTO" : "GANHO";
      
      setSelectedChartType(clickedType);
      setChartMode("detailed");
    } else if (elements.length > 0 && chartMode === "detailed") {
      // Clicou em uma categoria específica
      const clickedIndex = elements[0].index;
      const categoryData = getDataByCategory(selectedChartType);
      const categoryName = Object.keys(categoryData)[clickedIndex];
      
      setSelectedChartCategory(categoryName);
      setChartMode("micro");
    }
  };

  // Função para voltar ao gráfico geral
  const handleBackToOverview = () => {
    setChartMode("overview");
    setSelectedChartType(null);
    setSelectedChartCategory(null);
  };

  // Função para voltar ao modo detalhado (categorias)
  const handleBackToDetailed = () => {
    setChartMode("detailed");
    setSelectedChartCategory(null);
  };

  // Dados dinâmicos do gráfico baseado no modo
  const getDynamicChartData = () => {
    if (chartMode === "overview") {
      return {
        labels: ["Gastos", "Ganhos"],
        datasets: [
          {
            label: "Valores",
            data: [
              gastos.reduce((sum, expense) => sum + expense.valorDespesa, 0),
              ganhos.reduce((sum, expense) => sum + expense.valorDespesa, 0)
            ],
            backgroundColor: ["rgba(255, 99, 132, 0.2)", "rgba(75, 192, 192, 0.2)"],
            borderColor: ["rgba(255, 99, 132, 1)", "rgba(75, 192, 192, 1)"],
            borderWidth: 1,
          },
        ],
      };
    } else if (chartMode === "detailed") {
      // Modo detalhado por categoria
      const categoryData = getDataByCategory(selectedChartType);
      const labels = Object.keys(categoryData);
      const values = Object.values(categoryData);
      const baseColor = selectedChartType === "GASTO" ? "255, 99, 132" : "75, 192, 192";
      
      return {
        labels: labels,
        datasets: [
          {
            label: `${selectedChartType === "GASTO" ? "Gastos" : "Ganhos"} por Categoria`,
            data: values,
            backgroundColor: labels.map((_, index) => 
              `rgba(${baseColor}, ${0.2 + (index * 0.1) % 0.6})`
            ),
            borderColor: labels.map((_, index) => 
              `rgba(${baseColor}, ${0.8 + (index * 0.1) % 0.2})`
            ),
            borderWidth: 1,
          },
        ],
      };
    } else if (chartMode === "micro") {
      // Modo micro - gráfico por dia
      const microExpenses = expenses
        .filter(exp => {
          const expenseDate = parseISO(exp.date);
          const isMonthMatch = expenseDate.getMonth() === selectedMonth.getMonth() && 
                               expenseDate.getFullYear() === selectedMonth.getFullYear();
          const categoryName = exp.categoria?.nomeCategoria || "Sem categoria";
          const isTypeMatch = exp.tipoMovimento === selectedChartType;
          return isMonthMatch && categoryName === selectedChartCategory && isTypeMatch;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Agrupar por dia e nome
      const dayData = {};
      microExpenses.forEach(exp => {
        const day = format(addDays(parseISO(exp.date), 1), "dd/MM");
        const key = `${day} - ${exp.nomeDespesa}`;
        if (!dayData[key]) {
          dayData[key] = 0;
        }
        dayData[key] += exp.valorDespesa;
      });

      const labels = Object.keys(dayData);
      const values = Object.values(dayData);
      const baseColor = selectedChartType === "GASTO" ? "255, 99, 132" : "75, 192, 192";

      return {
        labels: labels,
        datasets: [
          {
            label: selectedChartCategory,
            data: values,
            backgroundColor: `rgba(${baseColor}, 0.5)`,
            borderColor: `rgba(${baseColor}, 1)`,
            borderWidth: 2,
          },
        ],
      };
    }
    return {
      labels: [],
      datasets: [],
    };
  };

  // Opções dinâmicas do gráfico
  const getDynamicChartOptions = () => {
    const baseOptions = {
      plugins: {
        legend: {
          labels: {
            color: "white",
          },
        },
        datalabels: {
          display: false,
        },
        tooltip: {
          enabled: true,
          callbacks: {
            label: (context) => {
              const value = context.raw;
              return `R$ ${value.toFixed(2).replace(".", ",")}`;
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

    // Adicionar funcionalidade de clique nos modos overview e detailed
    if (chartMode === "overview" || chartMode === "detailed") {
      baseOptions.onClick = handleChartClick;
    }

    return baseOptions;
  };

  const totalGastos = allGastos.reduce((sum, expense) => sum + expense.valorDespesa, 0);
  const totalGanhos = allGanhos.reduce((sum, expense) => sum + expense.valorDespesa, 0);
  const saldoMensal = totalGanhos - totalGastos;

  return (
    <div className="pessoal-container">
      <h2 className="pessoal-title">Controle Pessoal</h2>

      <div className="pessoal-month-selector">
        <button className="pessoal-btn-prev" onClick={() => handleMonthChange("prev")}>
          Mês Anterior
        </button>
        <span className="pessoal-month-text">{format(selectedMonth, "MMMM yyyy", { locale: ptBR })}</span>
        <button className="pessoal-btn-next" onClick={() => handleMonthChange("next")}>
          Próximo Mês
        </button>
      </div>

      <div className="pessoal-search-bar">
        <input
          type="text"
          placeholder="Pesquisar despesas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pessoal-search-input"
        />
      </div>

      <div className="pessoal-view-filter">
        <button 
          className={`pessoal-filter-btn ${viewFilter === "TODOS" ? "active" : ""}`}
          onClick={() => setViewFilter("TODOS")}
        >
          Todos ({allGastos.length + allGanhos.length})
        </button>
        <button 
          className={`pessoal-filter-btn ${viewFilter === "GASTOS_FIXOS" ? "active" : ""}`}
          onClick={() => setViewFilter("GASTOS_FIXOS")}
        >
          Gastos Fixos ({allGastos.filter(g => g.DespesaFixa === true).length})
        </button>
        <button 
          className={`pessoal-filter-btn ${viewFilter === "GASTOS_VARIAVEIS" ? "active" : ""}`}
          onClick={() => setViewFilter("GASTOS_VARIAVEIS")}
        >
          Gastos Variáveis ({allGastos.filter(g => g.DespesaFixa === false).length})
        </button>
        <button 
          className={`pessoal-filter-btn ${viewFilter === "GANHOS" ? "active" : ""}`}
          onClick={() => setViewFilter("GANHOS")}
        >
          Ganhos ({allGanhos.length})
        </button>
      </div>

      <div
        className="pessoal-form-container"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleAddExpense();
          }
        }}
      >
        {/* Modal de seleção de despesa fixa existente */}
        {showFixedExpenseSelectionModal && (
          <div className="pessoal-modal">
            <div className="pessoal-modal-content" style={{ maxWidth: "600px", maxHeight: "80vh", overflowY: "auto" }}>
              <h3 className="pessoal-modal-title">Atualizar Despesa Fixa Existente</h3>
              <p style={{ marginBottom: "15px", color: "#666", fontSize: "14px", textShadow: "none" }}>
                Selecione uma despesa fixa existente para atualizar ou crie uma nova:
              </p>
              
              {existingFixedExpenses.length > 0 ? (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ 
                    maxHeight: "300px", 
                    overflowY: "auto", 
                    border: "1px solid #ddd", 
                    borderRadius: "8px",
                    padding: "10px"
                  }}>
                    {existingFixedExpenses.map((expense) => (
                      <div 
                        key={expense.id}
                        onClick={() => handleSelectExistingFixedExpense(expense)}
                        style={{
                          padding: "12px",
                          marginBottom: "8px",
                          border: "2px solid #e0e0e0",
                          borderRadius: "6px",
                          cursor: "pointer",
                          transition: "all 0.2s",
                          backgroundColor: "#f9f9f9",
                          textShadow: "none"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#667eea";
                          e.currentTarget.style.backgroundColor = "#f0f0ff";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#e0e0e0";
                          e.currentTarget.style.backgroundColor = "#f9f9f9";
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong style={{ color: "#333", fontSize: "15px" }}>
                              {expense.nomeDespesa}
                            </strong>
                            <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                              {formatCurrency(expense.valorDespesa)} • {expense.categoria?.nomeCategoria || "Sem categoria"}
                            </div>
                            {expense.descDespesa && (
                              <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                                {expense.descDespesa}
                              </div>
                            )}
                          </div>
                          <div style={{
                            padding: "4px 12px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "600",
                            backgroundColor: expense.tipoMovimento === "GASTO" ? "#ffebee" : "#e8f5e9",
                            color: expense.tipoMovimento === "GASTO" ? "#c62828" : "#2e7d32"
                          }}>
                            {expense.tipoMovimento}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ 
                  padding: "20px", 
                  textAlign: "center", 
                  color: "#666", 
                  backgroundColor: "#f5f5f5",
                  borderRadius: "8px",
                  marginBottom: "20px",
                  textShadow: "none"
                }}>
                  Nenhuma despesa fixa encontrada neste mês
                </div>
              )}
              
              <div className="pessoal-modal-buttons">
                <button 
                  onClick={handleCreateNewFixedExpense}
                  style={{
                    background: "linear-gradient(135deg, #4caf50 0%, #45a049 100%)",
                    fontWeight: "600"
                  }}
                >
                  ➕ Criar Nova Despesa Fixa
                </button>
                <button onClick={() => {
                  setShowFixedExpenseSelectionModal(false);
                  setIsFixed(false);
                }}>
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {showFixedPeriodModal && (
          <div className="pessoal-modal">
            <div className="pessoal-modal-content">
              <h3 className="pessoal-modal-title">Período da Despesa Fixa</h3>
              <p style={{ marginBottom: "15px", color: "#666", fontSize: "14px" }}>
                Por quantos meses esta despesa será fixa?
              </p>
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", textShadow: "none" }}>
                  Número de meses:
                </label>
                <input 
                  className="pessoal-modal-input" 
                  type="number" 
                  min="1"
                  max="12"
                  value={fixedPeriodMonths} 
                  onChange={(e) => setFixedPeriodMonths(parseInt(e.target.value) || 1)} 
                  placeholder="Digite o número de meses (1-12)" 
                />
                <small style={{ display: "block", marginTop: "5px", color: "#888", textShadow: "none"  }}>
                  A despesa será criada para os próximos {fixedPeriodMonths} meses
                </small>
              </div>
              <div className="pessoal-modal-buttons">
                <button onClick={() => {
                  setShowFixedPeriodModal(false);
                  setIsFixed(true);
                }}>Confirmar</button>
                <button onClick={() => {
                  setShowFixedPeriodModal(false);
                  setIsFixed(false);
                }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
        
        {isCategoryModalAdd && (
          <div className="pessoal-modal">
            <div className="pessoal-modal-content">
              <h3 className="pessoal-modal-title">Adicionar Nova Categoria</h3>
              <input 
                className="pessoal-modal-input" 
                type="text" 
                value={newCategory} 
                onChange={(e) => setNewCategory(e.target.value)} 
                placeholder="Digite a nova categoria" 
              />
              <div className="pessoal-modal-buttons">
                <button onClick={handleAddCategory}>Confirmar</button>
                <button onClick={() => setIsCategoryModalAdd(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {isCategoryModalEdit && (
          <div className="pessoal-modal">
            <div className="pessoal-modal-content">
              <h3 className="pessoal-modal-title">Editar Categoria</h3>
              <input 
                className="pessoal-modal-input" 
                type="text" 
                value={editingCategoryName} 
                onChange={(e) => setEditingCategoryName(e.target.value)} 
                placeholder="Digite o novo nome da categoria" 
              />
              <div className="pessoal-modal-buttons">
                <button onClick={handleUpdateCategory} disabled={isLoading}>
                  {isLoading ? <FaSpinner className="pessoal-loading-icon" /> : "Salvar"}
                </button>
                <button onClick={() => {
                  setIsCategoryModalEdit(false);
                  setEditingCategoryId(null);
                  setEditingCategoryName("");
                }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}

        {/* 1. Campo Select Variável/Fixo */}
        <select 
          className="pessoal-input-field-small" 
          value={isFixed} 
          onChange={(e) => {
            const newValue = e.target.value === "true";
            if (newValue) {
              fetchExistingFixedExpenses();
            } else {
              setIsFixed(newValue);
            }
          }}
          style={{
            backgroundColor: isFixed ? "#fff3e0" : "#e3f2fd",
            borderColor: isFixed ? "#ff9800" : "#2196f3",
            borderWidth: "2px"
          }}
        >
          <option value="false">Variável</option>
          <option value="true">Fixa</option>
        </select>

        {/* 2. Nome com autocomplete de despesas variáveis */}
        <div style={{ position: "relative" }}>
          <input 
            className="pessoal-input-field"
            type="text" 
            value={newExpense} 
            onChange={(e) => {
              setNewExpense(e.target.value);
              // Só mostrar sugestões se NÃO estiver no modo de despesa fixa
              if (!isFixed) {
                getVariableExpenseSuggestions(e.target.value);
              }
            }}
            onFocus={(e) => {
              if (!isFixed && e.target.value) {
                getVariableExpenseSuggestions(e.target.value);
              }
            }}
            onBlur={() => {
              // Delay para permitir clique na sugestão
              setTimeout(() => setShowVariableSuggestions(false), 200);
              // Remover espaços do início e fim
              setNewExpense(prev => prev.trim());
            }}
            placeholder="Nome da despesa/ganho" 
            disabled={isEditingFixedExpense}
          />
          {showVariableSuggestions && variableExpenseSuggestions.length > 0 && (
            <ul style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              backgroundColor: "#fff",
              border: "2px solid #667eea",
              borderRadius: "8px",
              maxHeight: "200px",
              overflowY: "auto",
              zIndex: 1000,
              margin: "4px 0 0 0",
              padding: 0,
              listStyle: "none",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
            }}>
              {variableExpenseSuggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onClick={() => handleSelectVariableSuggestion(suggestion)}
                  style={{
                    padding: "10px 12px",
                    cursor: "pointer",
                    borderBottom: index < variableExpenseSuggestions.length - 1 ? "1px solid #eee" : "none",
                    color: "#333",
                    fontSize: "14px",
                    textShadow: "none",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px"
                  
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f0f0ff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  <span style={{ fontWeight: "500", flex: 1, textShadow: "none" }}>{suggestion.nomeDespesa}</span>
                  <span style={{ 
                    fontSize: "12px", 
                    color: suggestion.tipoMovimento === "GASTO" ? "#ef4444" : "#10b981",
                    fontWeight: "600",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    textShadow: "none",
                    backgroundColor: suggestion.tipoMovimento === "GASTO" ? "#fee2e2" : "#d1fae5"
                  }}>
                    {suggestion.tipoMovimento}
                  </span>
                  <span style={{ 
                    fontSize: "13px", 
                    color: "#667eea",
                    fontWeight: "600",
                    minWidth: "80px",
                    textAlign: "right",
                    textShadow: "none"
                  }}>
                    R$ {suggestion.valorDespesa.toFixed(2).replace('.', ',')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {/* 3. Valor */}
        <input 
          className="pessoal-input-field pessoal-input-value"
          type="number" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
          placeholder="Valor (R$)" 
        />
        
        {/* 4. Descrição */}
        <input 
          className="pessoal-input-field"
          type="text" 
          value={description} 
          onChange={(e) => setDescription(e.target.value)} 
          onBlur={() => setDescription(prev => prev.trim())}
          placeholder="Descrição" 
        />
        
        {/* 5. Data */}
        <input 
          className="pessoal-input-field"
          type="date" 
          value={date} 
          onChange={(e) => setDate(e.target.value)} 
        />

        {/* 6. Campo de seleção de categorias */}
        <div className="pessoal-category-select">
          <div 
            className="pessoal-category-display" 
            onClick={(e) => {
              e.stopPropagation();
              setIsCategoryModalOpen(prev => !prev);
              setCategoryFilter("");
            }} 
            tabIndex={0} 
            style={{ cursor: "pointer" }}
          >
            {selectedCategory ? 
              categories.find(cat => cat.id === parseInt(selectedCategory))?.nomeCategoria :
              <span className="pessoal-category-placeholder">Selecione a categoria</span>
            }
          </div>
          {isCategoryModalOpen && (
            <ul className="pessoal-category-dropdown">
              <li>
                <input
                  type="text"
                  className="pessoal-category-filter"
                  placeholder="Filtrar categorias..."
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              </li>
              {categories
                .filter((category) => category.nomeCategoria.toLowerCase().includes(categoryFilter.toLowerCase()))
                .map((category) => (
                  <li key={category.id} className="pessoal-category-item">
                    <span
                      className="pessoal-category-name"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCategory(category.id.toString());
                        setIsCategoryModalOpen(false);
                        setCategoryFilter("");
                      }}
                    >
                      {category.nomeCategoria}
                    </span>
                    <div className="pessoal-category-actions">
                      <button 
                        className="pessoal-category-edit" 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCategory(category);
                        }}
                        title="Editar categoria" 
                        disabled={isLoading}
                      >
                        ✏️
                      </button>
                      <button 
                        className="pessoal-category-delete" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDeleteCategory({ show: true, id: category.id });
                        }}
                        title="Excluir categoria" 
                        disabled={isLoading}
                      >
                        🗑️
                      </button>
                    </div>
                  </li>
                ))}
              <li 
                className="pessoal-category-add" 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCategoryModalAdd(true);
                  setIsCategoryModalOpen(false);
                }}
              >
                + Adicionar nova categoria
              </li>
            </ul>
          )}
        </div>

        {/* 7. Campo Select Gasto/Ganho */}
        <select 
          className="pessoal-input-field-small" 
          value={tipoMovimento} 
          onChange={(e) => setTipoMovimento(e.target.value)}
          style={{
            backgroundColor: tipoMovimento === "GASTO" ? "#ffebee" : "#e8f5e9",
            borderColor: tipoMovimento === "GASTO" ? "#ef5350" : "#66bb6a",
            borderWidth: "2px"
          }}
        >
          <option value="GASTO">Gasto</option>
          <option value="GANHO">Ganho</option>
        </select>
        
        {/* 8. Campo Select Vale (apenas quando for GASTO) */}
        {tipoMovimento === "GASTO" && (
          <div className="pessoal-vale-field">
            <label className="pessoal-vale-label">VALE?</label>
            <select className="pessoal-input-field-small" value={isVale} onChange={(e) => setIsVale(e.target.value === "true")}>
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </select>
          </div>
        )}
        

        <button 
          className="pessoal-save-btn" 
          onClick={handleAddExpense} 
          disabled={isLoading}
          style={{
            background: isEditingFixedExpense 
              ? "linear-gradient(135deg, #ff9800 0%, #f57c00 100%)" 
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
          }}
        >
          {isLoading ? (
            <FaSpinner className="pessoal-loading-icon" />
          ) : isEditingFixedExpense ? (
            "✏️ Atualizar"
          ) : (
            "Adicionar"
          )}
        </button>

        {isEditingFixedExpense && (
          <button 
            className="pessoal-save-btn" 
            onClick={() => {
              setNewExpense("");
              setAmount("");
              setDescription("");
              setDate(new Date().toISOString().substr(0, 10));
              setIsFixed(false);
              setTipoMovimento("GASTO");
              setIsVale(false);
              setSelectedCategory("");
              setIsEditingFixedExpense(false);
              setSelectedExistingExpense(null);
            }}
            style={{
              background: "linear-gradient(135deg, #6c757d 0%, #5a6268 100%)"
            }}
          >
            Cancelar
          </button>
        )}
      </div>

      <ul className="pessoal-expense-list">
        {Object.entries(groupedExpenses).length > 0 ? (
          <>
            {Object.entries(groupedExpenses)
              .sort(([a], [b]) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
              .map(([description, group]) => (
              <li key={description} className="pessoal-expense-group">
                <div className="pessoal-group-header" onClick={() => toggleGroup(description)}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span>{description}</span>
                    {group[0] && (
                      <span style={{
                        fontSize: "10px",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        backgroundColor: group[0].tipoMovimento === "GASTO" 
                          ? (group[0].DespesaFixa ? "#ff9800" : "#2196f3")
                          : "#4caf50",
                        color: "white",
                        fontWeight: "bold"
                      }}>
                        {group[0].tipoMovimento === "GASTO" 
                          ? (group[0].DespesaFixa ? "FIXO" : "VARIÁVEL")
                          : "GANHO"}
                      </span>
                    )}
                  </div>
                  <span>Total: {formatCurrency(group.reduce((sum, expense) => sum + expense.valorDespesa, 0))}</span>
                  <button className="pessoal-expand-btn">{expandedGroups[description] ? "Ocultar" : "Expandir"}</button>
                </div>
                {expandedGroups[description] && (
                  <ul className="pessoal-group-details">
                    {group.map((expense) => (
                      <li 
                        key={expense.id} 
                        className="pessoal-expense-item"
                        style={{
                          borderLeft: expense.tipoMovimento === "GASTO" 
                            ? (expense.DespesaFixa ? "4px solid #ff9800" : "4px solid #2196f3")
                            : "4px solid #4caf50",
                          
                        }}
                      >
                        {editExpenseId === expense.id ? (
                          <div className="pessoal-edit-form">
                            <div className="pessoal-edit-field">
                              <label className="pessoal-edit-label">Nome</label>
                              <input
                                type="text"
                                value={editDespesa}
                                onChange={(e) => setEditDespesa(e.target.value)}
                                placeholder="Novo nome"
                                className="pessoal-edit-input"
                              />
                            </div>
                            <div className="pessoal-edit-field">
                              <label className="pessoal-edit-label">Valor</label>
                              <input
                                type="number"
                                value={editAmount}
                                onChange={(e) => setEditAmount(e.target.value)}
                                placeholder="Novo valor"
                                className="pessoal-edit-input"
                              />
                            </div>
                            <div className="pessoal-edit-field">
                              <label className="pessoal-edit-label">Descrição</label>
                              <input
                                type="text"
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                placeholder="Nova descrição"
                                className="pessoal-edit-input"
                              />
                            </div>
                            <div className="pessoal-edit-field">
                              <label className="pessoal-edit-label">Categoria</label>
                              <select 
                                value={editCategoryId || ""} 
                                onChange={(e) => setEditCategoryId(e.target.value)}
                                className="pessoal-edit-input"
                              >
                                <option value="">Sem categoria</option>
                                {categories.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.nomeCategoria}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="pessoal-edit-field">
                              <label className="pessoal-edit-label">Tipo</label>
                              <select 
                                value={editTipoMovimento} 
                                onChange={(e) => setEditTipoMovimento(e.target.value)}
                                className="pessoal-edit-input"
                              >
                                <option value="GASTO">Gasto</option>
                                <option value="GANHO">Ganho</option>
                              </select>
                            </div>
                            <div className="pessoal-edit-buttons">
                              <button 
                                onClick={() => handleUpdateExpense(expense.id)} 
                                className="pessoal-update-btn"
                                disabled={isLoadingSave}
                              >
                                {isLoadingSave ? <FaSpinner className="pessoal-loading-icon" /> : "Salvar"}
                              </button>
                              <button 
                                onClick={() => setEditExpenseId(null)} 
                                className="pessoal-cancel-btn"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="pessoal-expense-info">
                            <span className="pessoal-expense-name">{expense.nomeDespesa}</span>
                            <span className="pessoal-expense-date">{format(addDays(parseISO(expense.date), 1), "dd/MM/yyyy", { locale: ptBR })}</span>
                            <span className="pessoal-expense-category" title={expense.categoria?.nomeCategoria || "Sem categoria"}>{expense.categoria?.nomeCategoria || "Sem categoria"}</span>
                            {expense.descDespesa && (
                              <span className="pessoal-expense-description" title={expense.descDespesa}>
                                {expense.descDespesa}
                              </span>
                            )}
                            <span className="pessoal-expense-amount" 
                                  style={{ color: expense.tipoMovimento === "GANHO" ? "#28a745" : "#dc3545" }}>
                              {expense.tipoMovimento === "GANHO" ? "+" : "-"}{formatCurrency(expense.valorDespesa)}
                            </span>
                            <span className="pessoal-expense-type" style={{ color: expense.tipoMovimento === "GANHO" ? "#28a745" : "#dc3545" }}>
                              {expense.tipoMovimento === "GANHO" ? "Ganho" : "Gasto"}
                            </span>
                            <div className="pessoal-expense-actions">
                              {/* <button onClick={() => handleEditExpense(expense)} className="pessoal-edit-btn">
                                Editar
                              </button> */}
                              <button onClick={() => handleDeleteExpense(expense.id)} className="pessoal-delete-btn">
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
          </>
        ) : (
          <li className="pessoal-no-expenses">
            {viewFilter === "TODOS"
              ? "Nenhuma despesa encontrada para este mês"
              : viewFilter === "GASTOS_FIXOS" 
              ? "Nenhum gasto fixo encontrado para este mês"
              : viewFilter === "GASTOS_VARIAVEIS"
              ? "Nenhum gasto variável encontrado para este mês"
              : "Nenhum ganho encontrado para este mês"
            }
          </li>
        )}
      </ul>

      {/* <button onClick={handleExportToExcel} className="pessoal-export-btn">
        Exportar para Excel
      </button> */}

      <div className="pessoal-chart-container">
        {chartMode === "detailed" && (
          <div className="pessoal-chart-header">
            <button className="pessoal-back-btn" onClick={handleBackToOverview}>
              ← Voltar ao Gráfico Geral
            </button>
            <h3 className="pessoal-chart-title">
              {selectedChartType === "GASTO" ? "Gastos" : "Ganhos"} por Categoria
            </h3>
          </div>
        )}
        {chartMode === "micro" && (
          <div className="pessoal-chart-header">
            <button className="pessoal-back-btn" onClick={handleBackToDetailed}>
              ← Voltar às Categorias
            </button>
            <h3 className="pessoal-chart-title">
              Detalhes: {selectedChartCategory}
            </h3>
          </div>
        )}
        
        {chartMode !== "micro" ? (
          <>
            <Bar data={getDynamicChartData()} options={getDynamicChartOptions()} plugins={[ChartDataLabels]} />
            {chartMode === "overview" && (
              <p className="pessoal-chart-hint">
                💡 Clique nas barras para ver detalhes por categoria
              </p>
            )}
            {chartMode === "detailed" && (
              <p className="pessoal-chart-hint">
                💡 Clique em uma categoria para ver todos os registros
              </p>
            )}
          </>
        ) : (
          <>
            <Bar data={getDynamicChartData()} options={getDynamicChartOptions()} plugins={[ChartDataLabels]} />
            <p className="pessoal-chart-hint">
              📊 Visualização detalhada por dia e despesa
            </p>
          </>
        )}
      </div>

      <div className="pessoal-total-summary">
        <div className="pessoal-total-item">
          <span style={{ color: "#dc3545" }}>Total de Gastos: {formatCurrency(totalGastos)}</span>
        </div>
        <div className="pessoal-total-item">
          <span style={{ color: "#28a745" }}>Total de Ganhos: {formatCurrency(totalGanhos)}</span>
        </div>
        <div className="pessoal-total-balance" style={{ fontWeight: "bold", fontSize: "18px" }}>
          <span style={{ color: saldoMensal >= 0 ? "#28a745" : "#dc3545" }}>
            Saldo do Mês: {formatCurrency(saldoMensal)}
          </span>
        </div>
      </div>

      {confirmDelete.show && (
        <Message 
          message="Tem certeza que deseja excluir esta despesa pessoal?" 
          type="warning" 
          onClose={cancelDeleteExpense} 
          onConfirm={confirmDeleteExpense} 
        />
      )}

      {confirmDeleteCategory.show && (
        <Message
          message="Deseja realmente excluir esta categoria?"
          type="warning"
          onClose={() => setConfirmDeleteCategory({ show: false, id: null })}
          onConfirm={() => {
            handleDeleteCategory(confirmDeleteCategory.id);
          }}
        />
      )}

      {message && <Message message={message.text} type={message.type} onClose={() => setMessage(null)} />}
    </div>
  );
};

export default Pessoal;
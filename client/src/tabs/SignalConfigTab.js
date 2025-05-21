import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Switch,
  TextField,
  Button,
  IconButton,
  Typography,
  Alert,
  Chip,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
} from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import SaveIcon from "@mui/icons-material/Save";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useBalance } from "../context/BalanceContext";
import TableSortLabel from "@mui/material/TableSortLabel";

// Component để hiển thị mảng dưới dạng chips
const ArrayDisplay = ({ items, maxWidth = 400 }) => {
  if (!items || items.length === 0) return <Typography>-</Typography>;

  // Nếu items là string, chuyển thành mảng
  const itemsArray =
    typeof items === "string" ? items.split(",").filter(Boolean) : items;

  return (
    <Box
      sx={{
        maxWidth: maxWidth,
        display: "flex",
        flexWrap: "wrap",
        gap: 0.5,
      }}
    >
      {itemsArray.map((item, index) => (
        <Tooltip key={index} title={item}>
          <Chip
            label={item}
            size="small"
            sx={{
              maxWidth: "100%",
              "& .MuiChip-label": {
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              },
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
};

// Hàm format trade_config giống bot Telegram
function formatTradeConfig(tradeConfig, balance = 0) {
  if (!tradeConfig) return "Không có dữ liệu";
  let costAmount = tradeConfig.FIX_COST_AMOUNT;
  if (tradeConfig.MARGIN?.MODE === "RATIO" && balance > 0) {
    costAmount =
      (balance * tradeConfig.MARGIN.RATIO) / tradeConfig.LONG_LEVERAGE;
  }
  let { profit, total } = calculateProfitAndLoss(tradeConfig, balance);
  let msg = "";
  // ON
  msg += `\n⚙️on=${tradeConfig.ON} monitor=${tradeConfig.MONITOR} trailing=${tradeConfig.TRAILING?.ON} paper=${tradeConfig.PAPER}\n🟢 long=${tradeConfig.LONG} short=${tradeConfig.SHORT} invert=${tradeConfig.INVERT} autoconfig=${tradeConfig.AUTO_CONFIG} mark=${tradeConfig.OPEN?.MARK}`;
  // VOLUME
  msg += `\n🟢longlevel=${tradeConfig.LONG_LEVERAGE}X  🛑 shortlevel=${
    tradeConfig.SHORT_LEVERAGE
  }X \n💵cost=${costAmount}$ volume=${(
    costAmount * tradeConfig.LONG_LEVERAGE
  ).toFixed(1)}$ margin.mode=${tradeConfig.MARGIN?.MODE} margin.ratio=${
    tradeConfig.MARGIN?.RATIO
  }`;
  // PROFIT
  msg += `\n✅tp=${tradeConfig.TP?.PERCENT} 🎯close=${
    tradeConfig.TP?.CLOSE
  } \n🏆total-profit = ${(total || 0).toFixed(2)}$ tp_type=${
    tradeConfig.TP?.TYPE
  } tp_time=${tradeConfig.TP?.TIME}s report_profit=${
    tradeConfig.REPORT_PROFIT
  }`;
  // STOPLOSS
  msg += `\n❌sl=${tradeConfig.SL?.SL_PERCENT}💦${(
    (tradeConfig.SL?.SL_PERCENT || 0) * costAmount
  ).toFixed(2)}$ sli=${tradeConfig.SL?.SLI_PERCENT}🆘sl2=${
    tradeConfig.SL?.SL2_PERCENT
  }💦${((tradeConfig.SL?.SL2_PERCENT || 0) * costAmount).toFixed(
    2
  )}$\n📌sl_time=${tradeConfig.SL?.SL_TIME}s sl_type=${tradeConfig.SL?.TYPE}${
    tradeConfig.SL?.TYPE === "CANDLE" ? `_${tradeConfig.SL?.SL_CANDLE}` : ""
  } max_loss=${tradeConfig.SL?.MAX_LOSS}$ `;
  // MONITOR
  msg += `\n🔔trailing_type:${tradeConfig.TRAILING?.TYPE} sptrigger=${tradeConfig.TRAILING?.TRIGGER_PERCENT} sp=${tradeConfig.TRAILING?.SP_PERCENT} r=${tradeConfig.TRAILING?.R_PERCENT}\n🔥hp=${tradeConfig.HP?.ON} hptrigger=${tradeConfig.HP?.HP_PERCENT_TRIGGER} rhsl=${tradeConfig.HP?.RHSL_PERCENT} rh=${tradeConfig.HP?.RH_PERCENT}`;
  // OPEN
  msg += `\n📤open_type=${tradeConfig.OPEN?.TYPE} spread=${(
    (tradeConfig.OPEN?.SPREAD || 0) * 100
  ).toFixed(2)}% wait=${tradeConfig.OPEN?.WAIT}m risk=${
    tradeConfig.OPEN?.RISK
  } max_position=${tradeConfig.OPEN?.MAX_POSITION}`;
  // COPY
  msg += `\n©️copy=${tradeConfig.COPY?.ON} max_volume=${
    tradeConfig.COPY?.MAX_VOLUME
  }$ rate=${((tradeConfig.COPY?.RATE || 0) * 100).toFixed(2)}%\n💸fix_cost: ${
    tradeConfig.COPY?.FIX
  } dca: ${tradeConfig.COPY?.DCA} follow: ${tradeConfig.COPY?.FOLLOW}`;
  return msg;
}

// Hàm tính profit dựa trên trade_config
const calculateProfitAndLoss = (tradeConfig, balance = 0) => {
  let costAmount = tradeConfig.FIX_COST_AMOUNT;
  // if margin.mode == RATIO, get current balance and calculate costAmount
  if (tradeConfig.MARGIN?.MODE === "RATIO" && balance > 0) {
    costAmount =
      (balance * tradeConfig.MARGIN.RATIO) / tradeConfig.LONG_LEVERAGE;
  }

  const slPercent = tradeConfig?.SL?.SL_PERCENT;
  const volume = costAmount * tradeConfig.LONG_LEVERAGE;

  const loss = costAmount * slPercent;

  if (!tradeConfig?.TP?.PERCENT) return { total: 0, profit: "" };

  let profits = "";
  let count = 0,
    profit = 0,
    total = 0;
  let length = tradeConfig.TP.PERCENT.length;

  tradeConfig.TP.PERCENT.map((tp) => {
    count += 1;
    profit = costAmount * (tradeConfig.TP.CLOSE || 1) * tp;

    if (count === length) {
      profit = costAmount * tp;
    }
    profits += `TP${count} ${(tp * 100).toFixed(1)}% $${profit.toFixed(2)}`;
    if (count !== length) profits += "\n";
    costAmount = costAmount * (1 - (tradeConfig.TP.CLOSE || 0));
    total += profit;
  });

  return {
    total: total,
    profit: profits,
    loss: loss,
    volume: volume,
  };
};

function SignalConfigTab() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { balance } = useBalance();
  const balances = {};
  if (balance) {
    balance.forEach((item) => {
      balances[item.account] = item.availableBalance;
    });
  }

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    user: "",
    accountSignal: "",
    signal: "",
    blacklist: "",
    on: false,
    volume: 0,
    openType: "",
  });
  const [openDialog, setOpenDialog] = useState(false);
  // Filter state
  const [filter, setFilter] = useState({
    user: "",
    accountSignal: "",
    signal: "",
    blacklist: "",
    openType: "",
    on: "",
    long: "",
    short: "",
    marginMode: "",
    slType: "",
    volume: "",
  });
  // State cho hàng tạo mới
  const [newForm, setNewForm] = useState({
    user: "",
    accountSignal: "",
    signal: "",
    blacklist: "",
    on: false,
    volume: 0,
    openType: "",
  });
  const [copiedFromAccountSignal, setCopiedFromAccountSignal] = useState("");
  const [viewConfig, setViewConfig] = useState(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "asc" });

  // Fetch configs
  const fetchConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://localhost:3001/api/signal-configs");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setConfigs(data);
      setError("");
    } catch (error) {
      console.error("Error fetching configs:", error);
      setError("Failed to fetch signal configs: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // Filtered configs
  const filteredConfigs = configs.filter((cfg) => {
    return (
      (!filter.user ||
        cfg.user.toLowerCase().includes(filter.user.toLowerCase())) &&
      (!filter.accountSignal ||
        cfg.accountSignal
          .toLowerCase()
          .includes(filter.accountSignal.toLowerCase())) &&
      (!filter.signal ||
        (Array.isArray(cfg.signal) ? cfg.signal.join(",") : cfg.signal)
          .toLowerCase()
          .includes(filter.signal.toLowerCase())) &&
      (!filter.blacklist ||
        (Array.isArray(cfg.blacklist) ? cfg.blacklist.join(",") : cfg.blacklist)
          .toLowerCase()
          .includes(filter.blacklist.toLowerCase())) &&
      (!filter.openType ||
        (cfg.openType || "")
          .toLowerCase()
          .includes(filter.openType.toLowerCase())) &&
      (filter.on === "" || String(cfg.on) === filter.on) &&
      (filter.long === "" || String(cfg.trade_config?.LONG) === filter.long) &&
      (filter.short === "" ||
        String(cfg.trade_config?.SHORT) === filter.short) &&
      (!filter.marginMode ||
        (cfg.trade_config?.MARGIN?.MODE || "")
          .toLowerCase()
          .includes(filter.marginMode.toLowerCase())) &&
      (!filter.slType ||
        (cfg.trade_config?.SL?.TYPE || "")
          .toLowerCase()
          .includes(filter.slType.toLowerCase())) &&
      (!filter.volume ||
        (cfg.volume !== undefined &&
          Number(cfg.volume) >= Number(filter.volume)))
    );
  });

  // Hàm xử lý sort
  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  // Sắp xếp filteredConfigs
  const sortedConfigs = [...filteredConfigs].sort((a, b) => {
    const { key, direction } = sortConfig;
    if (!key) return 0;
    let aValue, bValue;
    switch (key) {
      case "user":
        aValue = a.user || "";
        bValue = b.user || "";
        break;
      case "accountSignal":
        aValue = a.accountSignal || "";
        bValue = b.accountSignal || "";
        break;
      case "volume":
        aValue = a.volume || 0;
        bValue = b.volume || 0;
        break;
      case "profit": {
        const aDetails = calculateProfitAndLoss(
          a.trade_config,
          balances[a.user]
        );
        const bDetails = calculateProfitAndLoss(
          b.trade_config,
          balances[b.user]
        );
        aValue = aDetails.total || 0;
        bValue = bDetails.total || 0;
        break;
      }
      case "loss": {
        const aDetails = calculateProfitAndLoss(
          a.trade_config,
          balances[a.user]
        );
        const bDetails = calculateProfitAndLoss(
          b.trade_config,
          balances[b.user]
        );
        aValue = aDetails.loss || 0;
        bValue = bDetails.loss || 0;
        break;
      }
      case "marginMode":
        aValue = a.trade_config?.MARGIN?.MODE || "";
        bValue = b.trade_config?.MARGIN?.MODE || "";
        break;
      case "slType":
        aValue = a.trade_config?.SL?.TYPE || "";
        bValue = b.trade_config?.SL?.TYPE || "";
        break;
      default:
        return 0;
    }
    if (typeof aValue === "string" && typeof bValue === "string") {
      return direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    return direction === "asc" ? aValue - bValue : bValue - aValue;
  });

  // Handle edit
  const handleEdit = (config) => {
    setEditingId(config._id);
    setEditForm({
      ...config,
      signal: Array.isArray(config.signal)
        ? config.signal.join(",")
        : config.signal,
      blacklist: Array.isArray(config.blacklist)
        ? config.blacklist.join(",")
        : config.blacklist,
    });
    setOpenDialog(true);
  };

  // Handle save
  const handleSave = async () => {
    try {
      setLoading(true);
      const formData = {
        ...editForm,
        signal: editForm.signal
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        blacklist: editForm.blacklist
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const response = await fetch(
        `http://localhost:3001/api/signal-configs/${editingId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      await fetchConfigs();
      setEditingId(null);
      setOpenDialog(false);
      setError("");
    } catch (error) {
      setError("Failed to update signal config: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this config?")) return;
    try {
      setLoading(true);
      const response = await fetch(
        `http://localhost:3001/api/signal-configs/${id}`,
        {
          method: "DELETE",
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      await fetchConfigs();
      setError("");
    } catch (error) {
      console.error("Error deleting config:", error);
      setError("Failed to delete signal config: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({
      user: "",
      accountSignal: "",
      signal: "",
      blacklist: "",
      on: false,
      volume: 0,
      openType: "",
    });
    setOpenDialog(false);
  };

  // Handle create new
  const handleCreate = async () => {
    try {
      setLoading(true);
      const formData = {
        ...newForm,
        signal: newForm.signal
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        blacklist: newForm.blacklist
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        copiedFromAccountSignal: copiedFromAccountSignal || undefined,
      };
      const response = await fetch(`http://localhost:3001/api/signal-configs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      await fetchConfigs();
      setNewForm({
        user: "",
        accountSignal: "",
        signal: "",
        blacklist: "",
        on: false,
        volume: 0,
        openType: "",
      });
      setCopiedFromAccountSignal("");
      setError("");
    } catch (error) {
      setError("Failed to create signal config: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Khi chọn accountSignal để copy, tự động fill newForm nếu có
  useEffect(() => {
    if (copiedFromAccountSignal) {
      const found = configs.find(
        (cfg) => cfg.accountSignal === copiedFromAccountSignal
      );
      if (found) {
        setNewForm({
          ...found,
          accountSignal: found.accountSignal + "_COPY",
          user: "",
        });
      }
    }
    // eslint-disable-next-line
  }, [copiedFromAccountSignal]);

  // Danh sách accountSignal để copy
  const accountSignalOptions = Array.from(
    new Set(configs.map((cfg) => cfg.accountSignal))
  );

  // Xem chi tiết trade_config
  const handleView = (config) => {
    setViewConfig(config);
    setOpenViewDialog(true);
  };

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Filter row */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            mb: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            label="User"
            value={filter.user}
            onChange={(e) => setFilter({ ...filter, user: e.target.value })}
            size="small"
          />
          <TextField
            label="Account Signal"
            value={filter.accountSignal}
            onChange={(e) =>
              setFilter({ ...filter, accountSignal: e.target.value })
            }
            size="small"
          />
          <TextField
            label="Signal"
            value={filter.signal}
            onChange={(e) => setFilter({ ...filter, signal: e.target.value })}
            size="small"
          />
          <TextField
            label="Blacklist"
            value={filter.blacklist}
            onChange={(e) =>
              setFilter({ ...filter, blacklist: e.target.value })
            }
            size="small"
          />

          <TextField
            label="Open Type"
            value={filter.openType}
            onChange={(e) => setFilter({ ...filter, openType: e.target.value })}
            size="small"
          />
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>On</InputLabel>
            <Select
              value={filter.on ?? ""}
              label="On"
              onChange={(e) => setFilter({ ...filter, on: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">On</MenuItem>
              <MenuItem value="false">Off</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Long</InputLabel>
            <Select
              value={filter.long ?? ""}
              label="Long"
              onChange={(e) => setFilter({ ...filter, long: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">On</MenuItem>
              <MenuItem value="false">Off</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 80 }}>
            <InputLabel>Short</InputLabel>
            <Select
              value={filter.short ?? ""}
              label="Short"
              onChange={(e) => setFilter({ ...filter, short: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="true">On</MenuItem>
              <MenuItem value="false">Off</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Margin Mode</InputLabel>
            <Select
              value={filter.marginMode}
              label="Margin Mode"
              onChange={(e) =>
                setFilter({ ...filter, marginMode: e.target.value })
              }
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="FIX">FIX</MenuItem>
              <MenuItem value="RISK">RISK</MenuItem>
              <MenuItem value="RATIO">RATIO</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>SL Type</InputLabel>
            <Select
              value={filter.slType}
              label="SL Type"
              onChange={(e) => setFilter({ ...filter, slType: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="CANDLE">CANDLE</MenuItem>
              <MenuItem value="FOLLOWSIGNAL">FOLLOW SIGNAL</MenuItem>
              <MenuItem value="FIX">FIX</MenuItem>
              <MenuItem value="ATR">ATR</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Volume"
            value={filter.volume}
            onChange={(e) => setFilter({ ...filter, volume: e.target.value })}
            size="small"
            sx={{ minWidth: 80 }}
          />
          <Button
            onClick={() => setOpenCreateDialog(true)}
            variant="contained"
            color="primary"
            size="small"
            sx={{ ml: 2 }}
          >
            Tạo mới
          </Button>
        </Box>

        {/* Dialog tạo mới */}
        <Dialog
          open={openCreateDialog}
          onClose={() => {
            setOpenCreateDialog(false);
            setNewForm({
              user: "",
              accountSignal: "",
              signal: "",
              blacklist: "",
              on: false,
              volume: 0,
              openType: "",
            });
            setCopiedFromAccountSignal("");
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Tạo mới Signal Config
            <IconButton
              aria-label="close"
              onClick={() => setOpenCreateDialog(false)}
              sx={{ position: "absolute", right: 8, top: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
              <TextField
                label="User"
                value={newForm.user}
                onChange={(e) =>
                  setNewForm({ ...newForm, user: e.target.value })
                }
                size="small"
                placeholder="User"
                sx={{ flex: 1, minWidth: 120 }}
              />
              <Autocomplete
                freeSolo
                options={accountSignalOptions}
                value={newForm.accountSignal}
                onInputChange={(event, newValue) =>
                  setNewForm({ ...newForm, accountSignal: newValue })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Account Signal"
                  />
                )}
                sx={{ flex: 1, minWidth: 120 }}
              />
              <TextField
                label="Signal"
                value={newForm.signal}
                onChange={(e) =>
                  setNewForm({ ...newForm, signal: e.target.value })
                }
                size="small"
                placeholder="Signal"
                fullWidth
                sx={{ flex: 2, minWidth: 50 }}
              />
              <TextField
                label="Blacklist"
                value={newForm.blacklist}
                onChange={(e) =>
                  setNewForm({ ...newForm, blacklist: e.target.value })
                }
                size="small"
                placeholder="Blacklist"
                fullWidth
                sx={{ flex: 2, minWidth: 50 }}
              />
              <Box
                sx={{ display: "flex", alignItems: "center", minWidth: 120 }}
              >
                <Typography>On</Typography>
                <Switch
                  checked={newForm.on}
                  onChange={(e) =>
                    setNewForm({ ...newForm, on: e.target.checked })
                  }
                />
              </Box>
              <TextField
                label="Volume"
                type="number"
                value={newForm.volume}
                onChange={(e) =>
                  setNewForm({
                    ...newForm,
                    volume: parseFloat(e.target.value),
                  })
                }
                size="small"
                sx={{ flex: 1, minWidth: 120 }}
              />
              <TextField
                label="Open Type"
                value={newForm.openType}
                onChange={(e) =>
                  setNewForm({ ...newForm, openType: e.target.value })
                }
                size="small"
                sx={{ flex: 1, minWidth: 120 }}
              />
              <Autocomplete
                freeSolo
                options={accountSignalOptions}
                value={copiedFromAccountSignal}
                onInputChange={(event, newValue) =>
                  setCopiedFromAccountSignal(newValue)
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    placeholder="Copy Account Signal"
                  />
                )}
                sx={{ flex: 1, minWidth: 120 }}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => {
                setOpenCreateDialog(false);
                setNewForm({
                  user: "",
                  accountSignal: "",
                  signal: "",
                  blacklist: "",
                  on: false,
                  volume: 0,
                  openType: "",
                });
                setCopiedFromAccountSignal("");
              }}
              color="secondary"
              variant="outlined"
              startIcon={<CloseIcon />}
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreate}
              color="primary"
              variant="contained"
              startIcon={<SaveIcon />}
            >
              Tạo mới
            </Button>
          </DialogActions>
        </Dialog>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <TableSortLabel
                    active={sortConfig.key === "user"}
                    direction={
                      sortConfig.key === "user" ? sortConfig.direction : "asc"
                    }
                    onClick={() => handleSort("user")}
                  >
                    User
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ maxWidth: 10 }}>
                  <TableSortLabel
                    active={sortConfig.key === "accountSignal"}
                    direction={
                      sortConfig.key === "accountSignal"
                        ? sortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSort("accountSignal")}
                  >
                    Account Signal
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ maxWidth: 80 }}>Signal</TableCell>
                <TableCell sx={{ maxWidth: 80 }}>Blacklist</TableCell>
                <TableCell sx={{ maxWidth: 20 }}>
                  <TableSortLabel
                    active={sortConfig.key === "volume"}
                    direction={
                      sortConfig.key === "volume" ? sortConfig.direction : "asc"
                    }
                    onClick={() => handleSort("volume")}
                  >
                    Volume
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ maxWidth: 10 }}>TP</TableCell>
                <TableCell sx={{ maxWidth: 10 }}>SL</TableCell>
                <TableCell sx={{ maxWidth: 10 }}>
                  <TableSortLabel
                    active={sortConfig.key === "profit"}
                    direction={
                      sortConfig.key === "profit" ? sortConfig.direction : "asc"
                    }
                    onClick={() => handleSort("profit")}
                  >
                    Profit
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ maxWidth: 10 }}>
                  <TableSortLabel
                    active={sortConfig.key === "loss"}
                    direction={
                      sortConfig.key === "loss" ? sortConfig.direction : "asc"
                    }
                    onClick={() => handleSort("loss")}
                  >
                    Loss
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ maxWidth: 10 }}>On</TableCell>
                <TableCell sx={{ maxWidth: 10 }}>Long</TableCell>
                <TableCell sx={{ maxWidth: 10 }}>Short</TableCell>
                <TableCell sx={{ maxWidth: 15 }}>Open Type</TableCell>
                <TableCell sx={{ maxWidth: 15 }}>
                  <TableSortLabel
                    active={sortConfig.key === "marginMode"}
                    direction={
                      sortConfig.key === "marginMode"
                        ? sortConfig.direction
                        : "asc"
                    }
                    onClick={() => handleSort("marginMode")}
                  >
                    Margin Mode
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ maxWidth: 15 }}>
                  <TableSortLabel
                    active={sortConfig.key === "slType"}
                    direction={
                      sortConfig.key === "slType" ? sortConfig.direction : "asc"
                    }
                    onClick={() => handleSort("slType")}
                  >
                    SL Type
                  </TableSortLabel>
                </TableCell>
                <TableCell sx={{ maxWidth: 10 }}>Trailing Type</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedConfigs.map((config) => {
                const configDetails = calculateProfitAndLoss(
                  config.trade_config,
                  balances[config.user]
                );

                return (
                  <TableRow key={config._id}>
                    <TableCell>{config.user}</TableCell>
                    <TableCell>{config.accountSignal}</TableCell>
                    <TableCell sx={{ maxWidth: 80 }}>
                      <ArrayDisplay items={config.signal} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 80 }}>
                      <ArrayDisplay items={config.blacklist} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 20 }}>
                      {configDetails.volume.toFixed(1)} USDT
                    </TableCell>
                    <TableCell sx={{ maxWidth: 50 }}>
                      <ArrayDisplay
                        items={config.trade_config.TP?.PERCENT.map(
                          (item) => (item * 100).toFixed(1) + "%"
                        )}
                      />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 15 }}>
                      {(config.trade_config.SL?.SL_PERCENT * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell sx={{ maxWidth: 15 }}>
                      <Tooltip title={configDetails.profit}>
                        <Typography>
                          ${configDetails.total.toFixed(1)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 15 }}>
                      <Typography>${configDetails.loss.toFixed(1)}</Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 10 }}>
                      <Switch checked={config.on} disabled />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 10 }}>
                      <Switch checked={config.trade_config.LONG} disabled />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 10 }}>
                      <Switch checked={config.trade_config.SHORT} disabled />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 10 }}>
                      {config.openType}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 10 }}>
                      {config.trade_config.MARGIN.MODE}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 10 }}>
                      {config.trade_config.SL.TYPE}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 10 }}>
                      {config.trade_config.TRAILING.TYPE}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => handleView(config)}
                        title="Xem chi tiết trade_config"
                      >
                        <VisibilityIcon />
                      </IconButton>
                      <IconButton onClick={() => handleEdit(config)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDelete(config._id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog Edit */}
      <Dialog
        open={openDialog}
        onClose={handleCancelEdit}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Chỉnh sửa Signal Config
          <IconButton
            aria-label="close"
            onClick={handleCancelEdit}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <TextField
              label="User"
              value={editForm.user}
              onChange={(e) =>
                setEditForm({ ...editForm, user: e.target.value })
              }
              size="small"
              sx={{ flex: 1, minWidth: 120 }}
            />
            <TextField
              label="Account Signal"
              value={editForm.accountSignal}
              onChange={(e) =>
                setEditForm({ ...editForm, accountSignal: e.target.value })
              }
              size="small"
              sx={{ flex: 1, minWidth: 120 }}
            />
            <TextField
              label="Signal"
              value={editForm.signal}
              onChange={(e) =>
                setEditForm({ ...editForm, signal: e.target.value })
              }
              size="small"
              placeholder="Enter signals separated by commas"
              fullWidth
              sx={{ flex: 2, minWidth: 50 }}
            />
            <TextField
              label="Blacklist"
              value={editForm.blacklist}
              onChange={(e) =>
                setEditForm({ ...editForm, blacklist: e.target.value })
              }
              size="small"
              placeholder="Enter blacklist items separated by commas"
              fullWidth
              sx={{ flex: 2, minWidth: 50 }}
            />
            <Box sx={{ display: "flex", alignItems: "center", minWidth: 120 }}>
              <Typography>On</Typography>
              <Switch
                checked={editForm.on}
                onChange={(e) =>
                  setEditForm({ ...editForm, on: e.target.checked })
                }
              />
            </Box>
            <TextField
              label="Volume"
              type="number"
              value={editForm.volume}
              onChange={(e) =>
                setEditForm({ ...editForm, volume: parseFloat(e.target.value) })
              }
              size="small"
              sx={{ flex: 1, minWidth: 120 }}
            />
            <TextField
              label="Open Type"
              value={editForm.openType}
              onChange={(e) =>
                setEditForm({ ...editForm, openType: e.target.value })
              }
              size="small"
              sx={{ flex: 1, minWidth: 120 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCancelEdit}
            color="secondary"
            variant="outlined"
            startIcon={<CloseIcon />}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            color="primary"
            variant="contained"
            startIcon={<SaveIcon />}
          >
            Save
          </Button>
          <Button
            onClick={() => handleDelete(editingId)}
            color="error"
            variant="outlined"
            startIcon={<DeleteIcon />}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      {/* Dialog View trade_config */}
      <Dialog
        open={openViewDialog}
        onClose={() => setOpenViewDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Xem chi tiết trade_config
          <IconButton
            aria-label="close"
            onClick={() => setOpenViewDialog(false)}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Box>
            <Typography
              component="pre"
              sx={{ fontFamily: "monospace", whiteSpace: "pre-wrap" }}
            >
              {viewConfig
                ? formatTradeConfig(
                    viewConfig.trade_config,
                    balances[viewConfig.user]
                  )
                : "Không có dữ liệu"}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenViewDialog(false)}
            color="primary"
            variant="contained"
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SignalConfigTab;

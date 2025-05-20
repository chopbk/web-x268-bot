import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CancelIcon from "@mui/icons-material/Cancel";

function PositionsTab({
  positions,
  closePercent,
  handleClosePosition,
  handleCancelOrders,
}) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Account</TableCell>
            <TableCell>Symbol</TableCell>
            <TableCell>Side</TableCell>
            <TableCell>Entry</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Liq</TableCell>
            <TableCell>ROI</TableCell>
            <TableCell>PNL</TableCell>
            <TableCell>Volume</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {positions.map((position, index) => (
            <TableRow key={index}>
              <TableCell>{position.user}</TableCell>
              <TableCell>{position.symbol}</TableCell>
              <TableCell>{position.positionSide}</TableCell>
              <TableCell>{position.entryPrice}</TableCell>
              <TableCell>{position.markPrice}</TableCell>
              <TableCell>{position.liquidationPrice}</TableCell>
              <TableCell sx={{ color: position.roi >= 0 ? "green" : "red" }}>
                {position.roi.toFixed(2)}%
              </TableCell>
              <TableCell
                sx={{ color: position.unRealizedProfit >= 0 ? "green" : "red" }}
              >
                {position.unRealizedProfit.toFixed(2)}
              </TableCell>
              <TableCell>{position.volume}</TableCell>
              <TableCell>{position.type}</TableCell>
              <TableCell>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Button
                    variant="contained"
                    color="error"
                    size="small"
                    startIcon={<CloseIcon />}
                    onClick={() =>
                      handleClosePosition(
                        position.symbol,
                        position.positionSide
                      )
                    }
                  >
                    Close
                  </Button>
                  <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    startIcon={<CancelIcon />}
                    onClick={() => handleCancelOrders(position.symbol)}
                  >
                    Cancel Orders
                  </Button>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default PositionsTab;

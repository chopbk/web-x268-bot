import { Box, Typography, Chip, Tooltip } from "@mui/material";
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
        gap: 1,
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

export default ArrayDisplay;

import React, { useState, useEffect } from "react";
import { Box, Typography, Paper, Button, TextField } from "@mui/material";

function ConfigTab({ config, onConfigChange, onConfigSave }) {
  const [localConfig, setLocalConfig] = useState(config || {});

  useEffect(() => {
    setLocalConfig(config || {});
  }, [config]);

  const handleChange = (e) => {
    setLocalConfig({ ...localConfig, [e.target.name]: e.target.value });
    if (onConfigChange)
      onConfigChange({ ...localConfig, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    if (onConfigSave) onConfigSave(localConfig);
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6">Config</Typography>
      {config ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {Object.keys(localConfig).map((key) => (
            <TextField
              key={key}
              label={key}
              name={key}
              value={localConfig[key]}
              onChange={handleChange}
              fullWidth
            />
          ))}
          <Button variant="contained" onClick={handleSave}>
            Save Config
          </Button>
        </Box>
      ) : (
        <Typography>No config data</Typography>
      )}
    </Paper>
  );
}

export default ConfigTab;

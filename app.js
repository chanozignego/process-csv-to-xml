const { useState } = React;
const { Button, TextField, Container, Typography, Box, Divider, FormControl, InputLabel, Select, MenuItem } = MaterialUI;

function ExcelToXmlConverter() {

  const operationTypes = [
    { id: 1, key: "alta_cliente_persona_fisica", name: "Entidades Financieras Alta Cliente Persona Física", tag: "Entidades_Financieras_Alta_Cliente_Persona_Fisica", files_name: "RSMPH" },
    { id: 2, key: "alta_cliente_persona_juridica", name: "Entidades Financieras Alta Cliente Persona Jurídica", tag: "Entidades_Financieras_Alta_Cliente_Persona_Juridica", files_name: "RSMPJ" },
    { id: 3, key: "reporte_transacion_efectivo", name: "Reporte de Transacción en Efectivo", tag: "DATOS_GENERALES_DE_LA_TRANSACCI98N88Reporte_de_transacci93n_en_efectivo", files_name: "RTE" }
  ];

  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [selectedOperationType, setSelectedOperationType] = useState(operationTypes[0]);

  const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        setColumns(json[0]);
        const newMapping = {};
        json[0].forEach((c) => newMapping[c] = c.replaceAll(' ', '_'));
        setMapping(newMapping);
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleOperationTypeChange = (event) => {
    const selectedKey = event.target.value;
    const selectedOption = operationTypes.find(opt => opt.key === selectedKey);
    setSelectedOperationType(selectedOption);
  };

  const handleMappingChange = (col, tag) => {
    setMapping((prev) => ({ ...prev, [col]: tag }));
  };

  const getMappingValue = (col) => {
    if (!mapping) return;
    return mapping[col];
  };

  const generateXmlFiles = async () => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      
      const zip = new JSZip();
      json.forEach((row, index) => {
        let xml = `<?xml version='1.0' encoding='UTF-8'?>\n<Operacion>\n  <${selectedOperationType.tag}>\n`;
        
        // Función para generar etiquetas anidadas
        const generateNestedTags = (path, value) => {
          const parts = path.split('/');
          let openingTags = '';
          let closingTags = '';
          
          // Generar las etiquetas de apertura
          parts.forEach((part, index) => {
            openingTags += `    `.repeat(index);
            openingTags += `    <${part}>\n`;
          });
          
          // Generar las etiquetas de cierre en orden inverso
          parts.reverse().forEach((part, index) => {
            closingTags += `    `.repeat(parts.length - index - 1);
            closingTags += `    </${part}>\n`;
          });
          
          // Combinar apertura, valor y cierre
          return `${openingTags}${'    '.repeat(parts.length+1)}${value}\n${closingTags}`;
        };

        Object.entries(mapping).forEach(([col, tag]) => {
          if (tag.includes('/')) {
            // Si la etiqueta tiene múltiples niveles
            xml += generateNestedTags(tag, row[col]);
          } else {
            // Si la etiqueta es de un solo nivel
            xml += `    <${tag}>${row[col]}</${tag}>\n`;
          }
        });

        xml += `  </${selectedOperationType.tag}>\n</Operacion>`;
        zip.file(`${selectedOperationType.files_name}_${index+1}.xml`, xml);
      });
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "operaciones_xml.zip");
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <Container>
      <Box my={4}>
        {/* Texto inicial explicativo */}
        <Typography variant="body1" gutterBottom>
          Sube un archivo Excel (.xlsx, .xls, .csv) para convertirlo en archivos XML. 
          Asegúrate de que la primera fila del archivo contenga los nombres de las columnas.
        </Typography>
  
        {/* Input para subir archivo */}
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="file-upload"
        />
        <label htmlFor="file-upload">
          <Button variant="contained" component="span">Subir archivo</Button>
        </label>
  
        {/* Mostrar el nombre del archivo subido */}
        {file && (
          <Typography variant="body1" mt={2}>
            Archivo subido: {file.name}
          </Typography>
        )}
  
        {/* Divider después del botón */}
        {file && <Divider style={{ margin: "20px 0" }} />}
      </Box>
  
      {file && (<Box my={4}>
        <Typography variant="h5" gutterBottom>Tipo de Operaciones a Cargar</Typography>
        <FormControl fullWidth>
          <InputLabel>Selecciona una opción</InputLabel>
          <Select value={selectedOperationType.key} onChange={handleOperationTypeChange}>
            {operationTypes.map((operation) => (
              <MenuItem key={operation.id} value={operation.key}>
                {operation.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>)}

      {/* Mapeo de columnas */}
      {columns.length > 0 && (
        <Box my={4}>
          <Typography variant="h5" gutterBottom>Mapeo de columnas</Typography>
          <Typography variant="body1" gutterBottom>
            A continuación, asigna a cada columna de tu archivo una etiqueta XML. 
            Puedes usar '/' para crear etiquetas anidadas. Por ejemplo, "Persona/Nombre" generará:
            &lt;Persona&gt;&lt;Nombre&gt;valor&lt;/Nombre&gt;&lt;/Persona&gt;.
          </Typography>
  
          {columns.map((col) => (
            <Box key={col} mb={2}>
              <Typography variant="body1">{col}</Typography>
              <TextField
                label="Etiqueta XML"
                value={getMappingValue(col)}
                variant="outlined"
                fullWidth
                onChange={(e) => handleMappingChange(col, e.target.value)}
              />
            </Box>
          ))}
  
          <Button variant="contained" color="primary" onClick={generateXmlFiles}>
            Generar XML
          </Button>
        </Box>
      )}
    </Container>
  );
}

// Renderizar en el DOM
// ReactDOM.render(<ExcelToXmlConverter />, document.getElementById("root"));


ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(ExcelToXmlConverter));
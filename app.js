const { useState } = React;
const { Button, TextField, Container, Typography, Box, Divider } = MaterialUI;

function ExcelToXmlConverter() {
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});

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
      };
      reader.readAsArrayBuffer(selectedFile);
    }
  };

  const handleMappingChange = (col, tag) => {
    setMapping((prev) => ({ ...prev, [col]: tag }));
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
        let xml = "<?xml version='1.0' encoding='UTF-8'?>\n<Operacion>\n  <Entidades_Financieras_Alta_Cliente_Persona_Fisica>\n";
        
        // Función para generar etiquetas anidadas
        const generateNestedTags = (path, value) => {
          const parts = path.split('/');
          let openingTags = '';
          let closingTags = '';
          
          // Generar las etiquetas de apertura
          parts.forEach((part) => {
            openingTags += `    <${part}>\n`;
          });
          
          // Generar las etiquetas de cierre en orden inverso
          parts.reverse().forEach((part) => {
            closingTags += `    </${part}>\n`;
          });
          
          // Combinar apertura, valor y cierre
          return `${openingTags}      ${value}\n${closingTags}`;
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

        xml += "  </Entidades_Financieras_Alta_Cliente_Persona_Fisica>\n</Operacion>";
        zip.file(`row_${index}.xml`, xml);
      });
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "xml_files.zip");
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    React.createElement(Container, null,
      React.createElement(Box, { my: 4 },
        // Texto inicial explicativo
        React.createElement(Typography, { variant: "body1", gutterBottom: true },
          "Sube un archivo Excel (.xlsx, .xls, .csv) para convertirlo en archivos XML. Asegúrate de que la primera fila del archivo contenga los nombres de las columnas."
        ),
        // Input para subir archivo
        React.createElement("input", {
          type: "file",
          accept: ".xlsx,.xls,.csv",
          onChange: handleFileUpload,
          style: { display: 'none' },
          id: "file-upload"
        }),
        React.createElement("label", { htmlFor: "file-upload" },
          React.createElement(Button, { variant: "contained", component: "span" }, "Subir archivo")
        ),
        // Mostrar el nombre del archivo subido
        file && React.createElement(Typography, { variant: "body1", mt: 2 },
          `Archivo subido: ${file.name}`
        ),
        // Divider después del botón
        file && React.createElement(Divider, { style: { margin: "20px 0" } })
      ),
      // Mapeo de columnas
      columns.length > 0 &&
        React.createElement(Box, { my: 4 },
          React.createElement(Typography, { variant: "h5", gutterBottom: true }, "Mapeo de columnas"),
          // Texto explicativo sobre el mapeo
          React.createElement(Typography, { variant: "body1", gutterBottom: true },
            "A continuación, asigna a cada columna de tu archivo una etiqueta XML. " +
            "Puedes usar '/' para crear etiquetas anidadas. Por ejemplo, 'Persona/Nombre' generará: " +
            "<Persona><Nombre>valor</Nombre></Persona>."
          ),
          columns.map((col) =>
            React.createElement(Box, { key: col, mb: 2 },
              React.createElement(Typography, { variant: "body1" }, col),
              React.createElement(TextField, {
                label: "Etiqueta XML",
                variant: "outlined",
                fullWidth: true,
                onChange: (e) => handleMappingChange(col, e.target.value)
              })
            )
          ),
          React.createElement(Button, { variant: "contained", color: "primary", onClick: generateXmlFiles }, "Generar XML")
        )
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(ExcelToXmlConverter));
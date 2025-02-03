const { useState } = React;

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
        Object.entries(mapping).forEach(([col, tag]) => {
          xml += `    <${tag}>${row[col]}</${tag}>\n`;
        });
        xml += "  <Entidades_Financieras_Alta_Cliente_Persona_Fisica>\n</Operacion>";
        zip.file(`row_${index}.xml`, xml);
      });
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, "xml_files.zip");
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    React.createElement("div", null,
      React.createElement("input", { type: "file", accept: ".xlsx,.xls,.csv", onChange: handleFileUpload }),
      columns.length > 0 &&
        React.createElement("div", null,
          React.createElement("h3", null, "Mapeo de columnas"),
          columns.map((col) =>
            React.createElement("div", { key: col },
              React.createElement("label", null, col),
              React.createElement("input", {
                type: "text",
                placeholder: "Etiqueta XML",
                onChange: (e) => handleMappingChange(col, e.target.value)
              })
            )
          ),
          React.createElement("button", { onClick: generateXmlFiles }, "Generar XML")
        )
    )
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(ExcelToXmlConverter));

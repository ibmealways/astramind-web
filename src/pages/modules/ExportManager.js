import React from "react";

export default function ExportManager({ data, filename }) {

  const downloadFile = (content, type) => {

    const blob = new Blob([content], { type });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

  };

  const exportTXT = () => {

    downloadFile(data, "text/plain");

  };

  const exportJSON = () => {

    downloadFile(
      JSON.stringify(data,null,2),
      "application/json"
    );

  };

  const exportMarkdown = () => {

    let md = "";

    if(Array.isArray(data)){

      data.forEach(section=>{

        md += `# ${section.title}\n\n`;
        md += `${section.content}\n\n`;

      });

    }

    downloadFile(md,"text/markdown");

  };

  return (

    <div className="export-manager">

      <h3>Export Options</h3>

      <button onClick={exportTXT}>
        Export TXT
      </button>

      <button onClick={exportMarkdown}>
        Export Markdown
      </button>

      <button onClick={exportJSON}>
        Export JSON
      </button>

    </div>

  );

}
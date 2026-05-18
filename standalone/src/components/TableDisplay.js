class TableDisplay {
  constructor(headers, data) {
    this.headers = headers;
    this.data = data;
  }

  render() {
    const table = document.createElement('table');
    table.className = 'schedule-table';
    const headerRow = document.createElement('tr');

    // Create table headers
    this.headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header.label;
      th.setAttribute('data-i18n', header.i18nKey);
      headerRow.appendChild(th);
    });
    table.appendChild(headerRow);

    console.log("Created heder row", this.headers);
    console.log("Header row", headerRow);

    // Create table rows
    this.data.forEach(item => {
      const row = document.createElement('tr');
      Object.values(item).forEach(value => {
        const td = document.createElement('td');
        td.innerHTML = value; // Allow HTML content
        row.appendChild(td);
      });
      table.appendChild(row);
    });

    return table;
  }
}

export default TableDisplay;
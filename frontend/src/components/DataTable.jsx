export default function DataTable({ headers = [], rows = [] }) {
  return (
    <table className="table">
      <thead><tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>
        {rows.length ? rows.map((row, idx) => <tr key={idx}>{row.map((col, cidx) => <td key={cidx}>{col}</td>)}</tr>) : <tr><td colSpan={headers.length}>No data</td></tr>}
      </tbody>
    </table>
  );
}

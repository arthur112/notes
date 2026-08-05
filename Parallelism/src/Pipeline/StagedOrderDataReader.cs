using Parallelism.Domain;
using System.Data;

namespace Parallelism.Pipeline;

public sealed class StagedOrderDataReader(IReadOnlyList<StagedOrder> rows) : IDataReader
{
    private static readonly string[] Columns =
    [
        nameof(StagedOrder.RowNumber),
        nameof(StagedOrder.OrderDate),
        nameof(StagedOrder.CustomerName),
        nameof(StagedOrder.CustomerCity),
        nameof(StagedOrder.CustomerCountry),
        nameof(StagedOrder.CustomerEmail),
        nameof(StagedOrder.Channel),
        nameof(StagedOrder.Currency),
        nameof(StagedOrder.SalesRep),
        nameof(StagedOrder.Region),
        nameof(StagedOrder.Warehouse),
        nameof(StagedOrder.Product1),
        nameof(StagedOrder.Sku1),
        nameof(StagedOrder.Qty1),
        nameof(StagedOrder.Price1),
        nameof(StagedOrder.Discount1),
        nameof(StagedOrder.Product2),
        nameof(StagedOrder.Sku2),
        nameof(StagedOrder.Qty2),
        nameof(StagedOrder.Price2),
        nameof(StagedOrder.Discount2),
        nameof(StagedOrder.Product3),
        nameof(StagedOrder.Sku3),
        nameof(StagedOrder.Qty3),
        nameof(StagedOrder.Price3),
        nameof(StagedOrder.Discount3),
        nameof(StagedOrder.ShipMethod),
        nameof(StagedOrder.Priority),
        nameof(StagedOrder.Notes),
        nameof(StagedOrder.RowHash),
    ];

    public static IReadOnlyList<string> ColumnNames => Columns;

    private int _index = -1;

    public int FieldCount => Columns.Length;
    public int Depth => 0;
    public int RecordsAffected => -1;
    public bool IsClosed => _index >= rows.Count;

    public bool Read()
    {
        _index++;
        return _index < rows.Count;
    }

    public string GetName(int i) => Columns[i];

    public int GetOrdinal(string name) => Array.IndexOf(Columns, name);

    public object GetValue(int i)
    {
        var row = rows[_index];
        return i switch
        {
            0 => row.RowNumber,
            1 => row.OrderDate,
            2 => row.CustomerName,
            3 => row.CustomerCity,
            4 => row.CustomerCountry,
            5 => row.CustomerEmail,
            6 => row.Channel,
            7 => row.Currency,
            8 => row.SalesRep,
            9 => row.Region,
            10 => row.Warehouse,
            11 => row.Product1,
            12 => row.Sku1,
            13 => row.Qty1,
            14 => row.Price1,
            15 => row.Discount1,
            16 => row.Product2,
            17 => row.Sku2,
            18 => row.Qty2,
            19 => row.Price2,
            20 => row.Discount2,
            21 => row.Product3,
            22 => row.Sku3,
            23 => row.Qty3,
            24 => row.Price3,
            25 => row.Discount3,
            26 => row.ShipMethod,
            27 => row.Priority,
            28 => row.Notes,
            29 => row.RowHash,
            _ => throw new IndexOutOfRangeException(),
        };
    }

    public bool IsDBNull(int i) => false;
    public Type GetFieldType(int i) => i == 0 ? typeof(int) : typeof(string);
    public int GetValues(object[] values)
    {
        var count = Math.Min(values.Length, FieldCount);
        for (var i = 0; i < count; i++)
        {
            values[i] = GetValue(i);
        }
        return count;
    }

    public void Close() => _index = rows.Count;
    public void Dispose() => Close();

    public object this[int i] => GetValue(i);
    public object this[string name] => GetValue(GetOrdinal(name));

    public DataTable? GetSchemaTable() => throw new NotSupportedException();
    public bool NextResult() => false;
    public bool GetBoolean(int i) => throw new NotSupportedException();
    public byte GetByte(int i) => throw new NotSupportedException();
    public long GetBytes(int i, long fieldOffset, byte[]? buffer, int bufferoffset, int length) => throw new NotSupportedException();
    public char GetChar(int i) => throw new NotSupportedException();
    public long GetChars(int i, long fieldoffset, char[]? buffer, int bufferoffset, int length) => throw new NotSupportedException();
    public IDataReader GetData(int i) => throw new NotSupportedException();
    public string GetDataTypeName(int i) => GetFieldType(i).Name;
    public DateTime GetDateTime(int i) => throw new NotSupportedException();
    public decimal GetDecimal(int i) => throw new NotSupportedException();
    public double GetDouble(int i) => throw new NotSupportedException();
    public float GetFloat(int i) => throw new NotSupportedException();
    public Guid GetGuid(int i) => throw new NotSupportedException();
    public short GetInt16(int i) => throw new NotSupportedException();
    public int GetInt32(int i) => (int)GetValue(i);
    public long GetInt64(int i) => throw new NotSupportedException();
    public string GetString(int i) => (string)GetValue(i);
}

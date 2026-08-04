using ExcelImport.Transform.Inventory;
using ExcelImport.Transform.Orders;
using System.Text.Json.Serialization;

namespace ExcelImport;

[JsonSourceGenerationOptions(PropertyNameCaseInsensitive = true)]
[JsonSerializable(typeof(OrderImportRow))]
[JsonSerializable(typeof(InventoryImportRow))]
[JsonSerializable(typeof(Dictionary<string, string>))]
public partial class ImportJsonContext : JsonSerializerContext;

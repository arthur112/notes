namespace StranglerTable.Data;

public sealed record MigrationPhase(int Value)
{
    public bool IsPhase2 => Value >= 2;
}

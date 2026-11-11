using System.Net;
using System.Net.Http.Json;
using Api.Features.Customers;
using Api.Features.Orders;
using Api.Tests.Builders;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using TUnit.Assertions.Enums;

namespace Api.Tests;

public class OrdersTests : DatabaseTestBase
{
    private Task<CustomerEntity> SeedCustomerAsync(string name) =>
        SeedAsync(CustomerEntityBuilder.Create().WithName(name).Build());

    private async Task<TestPagedResult<ListOrders.OrderRow>> ListAsync(string query) =>
        (await CreateEditorClient().GetFromJsonAsync<TestPagedResult<ListOrders.OrderRow>>($"/api/orders?{query}"))!;

    private static string Filter(string filter) => $"filter={Uri.EscapeDataString(filter)}";

    [Test]
    public async Task Create_Returns_The_Order_With_Its_Number()
    {
        await SeedCustomerAsync("Acme");

        var response = await CreateEditorClient()
            .PostAsJsonAsync(
                "/api/orders",
                OrderInputBuilder.For("Acme").WithLines(new OrderLine("Anvil", 3, 43.3m)).Build()
            );

        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.Created);
        var order = await response.Content.ReadFromJsonAsync<OrderDetail>();
        await Assert.That(order!.OrderNo).StartsWith("ORD-1001");
        await Assert.That(order.Customer).IsEqualTo("Acme");
        await Assert.That(order.CreatedAt).IsEqualTo(DateOnly.FromDateTime(DateTime.UtcNow));
        await Assert.That(response.Headers.Location!.ToString()).IsEqualTo($"/api/orders/{order.OrderNo}");
    }

    [Test]
    public async Task Invalid_Lines_Are_Reported_On_The_Form_Field_Paths()
    {
        await SeedCustomerAsync("Acme");

        var response = await CreateEditorClient()
            .PostAsJsonAsync(
                "/api/orders",
                OrderInputBuilder.For("Acme").WithLines(new OrderLine("", 0, -1)).Build()
            );

        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();
        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.BadRequest);
        await Assert
            .That(problem!.Errors.Keys)
            .IsEquivalentTo(["lines[0].product", "lines[0].quantity", "lines[0].unitPrice"]);
    }

    [Test]
    public async Task Customer_On_Credit_Hold_Is_A_Customer_Error()
    {
        await SeedAsync(CustomerEntityBuilder.Create().WithName("Umbrella").OnHold().Build());

        var response = await CreateEditorClient()
            .PostAsJsonAsync("/api/orders", OrderInputBuilder.For("Umbrella").Build());

        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();
        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.BadRequest);
        await Assert.That(problem!.Errors["customer"]).IsEquivalentTo(["Umbrella is on credit hold."]);
    }

    [Test]
    public async Task Reference_Must_Be_Unique_Except_On_Its_Own_Order()
    {
        var acme = await SeedCustomerAsync("Acme");
        var existing = await SeedAsync(OrderEntityBuilder.For(acme).WithReference("PO-1").Build());
        var client = CreateEditorClient();

        var create = await client.PostAsJsonAsync(
            "/api/orders",
            OrderInputBuilder.For("Acme").WithReference("PO-1").Build()
        );
        var problem = await create.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();
        await Assert.That(problem!.Errors["reference"]).IsEquivalentTo(["Already used on another order"]);

        var update = await client.PutAsJsonAsync(
            $"/api/orders/{existing.OrderNo}",
            OrderInputBuilder.For("Acme").WithReference("PO-1").Build()
        );
        await Assert.That(update.StatusCode).IsEqualTo(HttpStatusCode.OK);

        await Assert
            .That(await client.GetFromJsonAsync<bool>("/api/orders/reference-taken?reference=PO-1"))
            .IsTrue();
        await Assert
            .That(
                await client.GetFromJsonAsync<bool>(
                    $"/api/orders/reference-taken?reference=PO-1&exceptOrderNo={existing.OrderNo}"
                )
            )
            .IsFalse();
    }

    [Test]
    public async Task Update_Replaces_The_Lines()
    {
        var acme = await SeedCustomerAsync("Acme");
        await SeedCustomerAsync("Globex");
        var order = await SeedAsync(
            OrderEntityBuilder.For(acme).WithLine("Anvil", 1, 10).WithLine("Rope", 2, 5).Build()
        );

        var response = await CreateEditorClient()
            .PutAsJsonAsync(
                $"/api/orders/{order.OrderNo}",
                OrderInputBuilder
                    .For("Globex")
                    .WithStatus(OrderStatus.Shipped)
                    .WithLines(new OrderLine("Stapler", 1, 310.5m))
                    .Build()
            );

        var updated = await response.Content.ReadFromJsonAsync<OrderDetail>();
        await Assert.That(updated!.Customer).IsEqualTo("Globex");
        await Assert.That(updated.Status).IsEqualTo(OrderStatus.Shipped);
        await Assert.That(updated.Lines).IsEquivalentTo([new OrderLine("Stapler", 1, 310.5m)]);
        await using var db = CreateDbContext();
        await Assert.That(await db.Set<OrderLineEntity>().CountAsync()).IsEqualTo(1);
    }

    [Test]
    public async Task Missing_Order_Is_Not_Found()
    {
        var client = CreateEditorClient();

        var get = await client.GetAsync("/api/orders/ORD-999999");
        var put = await client.PutAsJsonAsync("/api/orders/ORD-999999", OrderInputBuilder.For("Acme").Build());

        await Assert.That(get.StatusCode).IsEqualTo(HttpStatusCode.NotFound);
        await Assert.That(put.StatusCode).IsEqualTo(HttpStatusCode.NotFound);
    }

    [Test]
    public async Task Missing_Due_Date_And_Urgency_Are_Field_Errors()
    {
        await SeedCustomerAsync("Acme");

        var response = await CreateEditorClient()
            .PostAsJsonAsync("/api/orders", OrderInputBuilder.For("Acme").WithDueDate(null).WithUrgent(null).Build());

        var problem = await response.Content.ReadFromJsonAsync<HttpValidationProblemDetails>();
        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.BadRequest);
        await Assert.That(problem!.Errors.Keys).IsEquivalentTo(["dueDate", "isUrgent"]);
    }

    [Test]
    public async Task Customer_Settings_Override_The_Entered_Values()
    {
        await SeedAsync(
            CustomerEntityBuilder.Create().WithName("Hooli").WithSettings(OrderStatus.Paid, forcedDueDays: 30).Build()
        );
        var today = DateOnly.FromDateTime(DateTime.UtcNow);

        var response = await CreateEditorClient()
            .PostAsJsonAsync(
                "/api/orders",
                OrderInputBuilder.For("Hooli").WithStatus(OrderStatus.Pending).WithDueDate(today).Build()
            );

        var order = await response.Content.ReadFromJsonAsync<OrderDetail>();
        await Assert.That(response.StatusCode).IsEqualTo(HttpStatusCode.Created);
        await Assert.That(order!.Status).IsEqualTo(OrderStatus.Paid);
        await Assert.That(order.DueDate).IsEqualTo(today.AddDays(30));
    }

    [Test]
    public async Task Customer_Change_Drops_The_Previous_Reference()
    {
        var acme = await SeedCustomerAsync("Acme");
        await SeedCustomerAsync("Globex");
        var kept = await SeedAsync(OrderEntityBuilder.For(acme).WithReference("PO-77").Build());
        var replaced = await SeedAsync(OrderEntityBuilder.For(acme).WithReference("PO-78").Build());
        var client = CreateEditorClient();

        var dropped = await client.PutAsJsonAsync(
            $"/api/orders/{kept.OrderNo}",
            OrderInputBuilder.For("Globex").WithReference("PO-77").Build()
        );
        var renewed = await client.PutAsJsonAsync(
            $"/api/orders/{replaced.OrderNo}",
            OrderInputBuilder.For("Globex").WithReference("PO-88").Build()
        );

        await Assert.That((await dropped.Content.ReadFromJsonAsync<OrderDetail>())!.Reference).IsNull();
        await Assert.That((await renewed.Content.ReadFromJsonAsync<OrderDetail>())!.Reference).IsEqualTo("PO-88");
    }

    // The filters below are the strings the front's orders filter builds (web/src/domains/orders/filter.ts).

    [Test]
    public async Task Computed_Fields_Filter_And_Sort_In_Sql()
    {
        var acme = await SeedCustomerAsync("Acme");
        await SeedAsync(OrderEntityBuilder.For(acme).WithReference("one").WithLine("A", 1, 50).Build());
        await SeedAsync(OrderEntityBuilder.For(acme).WithReference("two").WithLine("A", 1, 100).WithLine("B", 2, 100).Build());
        await SeedAsync(OrderEntityBuilder.For(acme).WithReference("big").WithLine("A", 1, 900).WithLine("B", 1, 1).Build());

        var twoLines = await ListAsync($"orderBy=total desc&{Filter("lineCount=2,total>=100,total<=500")}");

        await Assert.That(twoLines.Data.Select(o => o.Total)).IsEquivalentTo([300m]);

        var byTotal = await ListAsync("orderBy=total desc");
        await Assert.That(byTotal.Data.Select(o => o.Total)).IsEquivalentTo([901m, 300m, 50m], CollectionOrdering.Matching);
    }

    [Test]
    public async Task Customer_Is_Filtered_By_Number_And_Searched_By_Name()
    {
        var acme = await SeedCustomerAsync("Acme Corp");
        var globex = await SeedCustomerAsync("Globex");
        await SeedAsync(OrderEntityBuilder.For(acme).WithStatus(OrderStatus.Paid).Build());
        await SeedAsync(OrderEntityBuilder.For(acme).WithStatus(OrderStatus.Pending).Build());
        await SeedAsync(OrderEntityBuilder.For(globex).WithStatus(OrderStatus.Paid).Build());

        var byNumber = await ListAsync(Filter($"customer.customerNo={acme.CustomerNo},status=Paid"));
        var bySearch = await ListAsync(Filter("(orderNo=*acme|customer.name=*acme)"));

        await Assert.That(byNumber.Count).IsEqualTo(1);
        await Assert.That(byNumber.Data.Single().Customer).IsEqualTo("Acme Corp");
        await Assert.That(bySearch.Count).IsEqualTo(2);
    }

    [Test]
    [Arguments("(isUrgent=true,isInvoiced=true)", "urgent invoiced")]
    [Arguments("(isUrgent=true,customer.isOnHold=true)", "urgent held")]
    [Arguments("(isUrgent=true,customer.hasFixedDueDate=true)", "urgent fixed")]
    public async Task Flags_Must_All_Match_Across_Order_And_Customer_Columns(string filter, string expected)
    {
        var plain = await SeedCustomerAsync("Plain");
        var held = await SeedAsync(CustomerEntityBuilder.Create().OnHold().Build());
        var fixedDue = await SeedAsync(CustomerEntityBuilder.Create().WithSettings(forcedDueDays: 30).Build());
        var invoiced = new DateOnly(2026, 1, 2);
        OrderEntity[] orders =
        [
            await SeedAsync(OrderEntityBuilder.For(plain).WithReference("urgent invoiced").Urgent().InvoicedOn(invoiced).Build()),
            await SeedAsync(OrderEntityBuilder.For(plain).WithReference("urgent").Urgent().Build()),
            await SeedAsync(OrderEntityBuilder.For(plain).WithReference("invoiced").InvoicedOn(invoiced).Build()),
            await SeedAsync(OrderEntityBuilder.For(held).WithReference("urgent held").Urgent().Build()),
            await SeedAsync(OrderEntityBuilder.For(held).WithReference("held").Build()),
            await SeedAsync(OrderEntityBuilder.For(fixedDue).WithReference("urgent fixed").Urgent().Build()),
        ];

        var page = await ListAsync(Filter(filter));

        var matched = page.Data.Select(row => orders.Single(o => o.OrderNo == row.OrderNo).Reference!);
        await Assert.That(matched).IsEquivalentTo([expected]);
    }
}

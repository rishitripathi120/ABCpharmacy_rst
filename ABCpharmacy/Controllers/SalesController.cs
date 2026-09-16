using ABCpharmacy.Models;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace ABCpharmacy.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SalesController : ControllerBase
    {
        private readonly string _medicineFilePath;
        private readonly string _salesFilePath;

        public SalesController(IWebHostEnvironment environment)
        {
            _medicineFilePath = Path.Combine(
                environment.ContentRootPath,
                "Data",
                "medicines.json");

            _salesFilePath = Path.Combine(
                environment.ContentRootPath,
                "Data",
                "sales.json");
        }

        [HttpGet]
        public async Task<ActionResult<List<Sale>>> GetSales()
        {
            var sales = await ReadSalesAsync();

            return Ok(sales);
        }

        [HttpPost]
        public async Task<ActionResult<Sale>> CreateSale(
            [FromBody] CreateSaleRequest request)
        {
            if (request.Quantity <= 0)
            {
                return BadRequest("Sale quantity must be greater than zero.");
            }

            var medicines = await ReadMedicinesAsync();

            var medicine = medicines.FirstOrDefault(
                x => x.Id == request.MedicineId);

            if (medicine == null)
            {
                return NotFound("Medicine not found.");
            }

            if (medicine.Quantity < request.Quantity)
            {
                return BadRequest("Insufficient stock.");
            }

            medicine.Quantity -= request.Quantity;

            var sales = await ReadSalesAsync();

            var sale = new Sale
            {
                Id = sales.Count == 0
                    ? 1
                    : sales.Max(x => x.Id) + 1,

                MedicineId = medicine.Id,
                MedicineName = medicine.FullName,
                Quantity = request.Quantity,
                UnitPrice = medicine.Price,
                TotalAmount = medicine.Price * request.Quantity,
                SaleDate = DateTime.Now
            };

            sales.Add(sale);

            await WriteMedicinesAsync(medicines);
            await WriteSalesAsync(sales);

            return Ok(sale);
        }

        private async Task<List<Medicine>> ReadMedicinesAsync()
        {
            Console.WriteLine($"Reading file from: {_medicineFilePath}");

            if (!System.IO.File.Exists(_medicineFilePath))
            {
                Console.WriteLine("FILE NOT FOUND");
                return new List<Medicine>();
            }

            var json = await System.IO.File.ReadAllTextAsync(_medicineFilePath);

            Console.WriteLine("JSON DATA:");
            Console.WriteLine(json);

            var medicines = JsonSerializer.Deserialize<List<Medicine>>(json);

            Console.WriteLine($"Medicine count: {medicines?.Count}");

            return medicines ?? new List<Medicine>();
        }

        private async Task<List<Sale>> ReadSalesAsync()
        {
            if (!System.IO.File.Exists(_salesFilePath))
            {
                return new List<Sale>();
            }

            var json = await System.IO.File.ReadAllTextAsync(
                _salesFilePath);

            return JsonSerializer.Deserialize<List<Sale>>(json)
                   ?? new List<Sale>();
        }

        private async Task WriteMedicinesAsync(
            List<Medicine> medicines)
        {
            var options = new JsonSerializerOptions
            {
                WriteIndented = true
            };

            var json = JsonSerializer.Serialize(
                medicines,
                options);

            await System.IO.File.WriteAllTextAsync(
                _medicineFilePath,
                json);
        }

        private async Task WriteSalesAsync(List<Sale> sales)
        {
            var options = new JsonSerializerOptions
            {
                WriteIndented = true
            };

            var json = JsonSerializer.Serialize(
                sales,
                options);

            await System.IO.File.WriteAllTextAsync(
                _salesFilePath,
                json);
        }
    }

    public class CreateSaleRequest
    {
        public int MedicineId { get; set; }

        public int Quantity { get; set; }
    }
}
using ABCpharmacy.Models;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace ABCpharmacy.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MedicinesController : ControllerBase
    {
        private readonly string _filePath;

        public MedicinesController(IWebHostEnvironment environment)
        {
            _filePath = Path.Combine(
                environment.ContentRootPath,
                "Data",
                "medicines.json");
        }

        [HttpGet]
        public async Task<ActionResult<List<Medicine>>> GetMedicines()
        {
            var medicines = await ReadMedicinesAsync();

            return Ok(medicines);
        }

        [HttpPost]
        public async Task<ActionResult<Medicine>> AddMedicine(Medicine medicine)
        {
            var medicines = await ReadMedicinesAsync();

            medicine.Id = medicines.Count == 0
                ? 1
                : medicines.Max(x => x.Id) + 1;

            medicines.Add(medicine);

            await WriteMedicinesAsync(medicines);

            return Ok(medicine);
        }

        private async Task<List<Medicine>> ReadMedicinesAsync()
        {
            Console.WriteLine($"FILE PATH: {_filePath}");

            if (!System.IO.File.Exists(_filePath))
            {
                Console.WriteLine("FILE NOT FOUND");
                return new List<Medicine>();
            }

            var json = await System.IO.File.ReadAllTextAsync(_filePath);

            Console.WriteLine("JSON READ FROM FILE:");
            Console.WriteLine(json);

            var medicines = JsonSerializer.Deserialize<List<Medicine>>(json);

            Console.WriteLine($"COUNT: {medicines?.Count}");

            return medicines ?? new List<Medicine>();
        }

        private async Task WriteMedicinesAsync(List<Medicine> medicines)
        {
            var options = new JsonSerializerOptions
            {
                WriteIndented = true
            };

            var json = JsonSerializer.Serialize(medicines, options);

            await System.IO.File.WriteAllTextAsync(_filePath, json);
        }
    }
}
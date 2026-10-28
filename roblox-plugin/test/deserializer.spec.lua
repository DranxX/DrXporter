return function()
	describe("Deserializer", function()
		it("should deserialize instance JSON from table", function()
			local Deserializer = require(script.Parent.Parent.src.plugin.deserializer["instance-json"])
			local result = Deserializer.fromTable({
				uuid = "test-uuid",
				className = "Part",
				name = "TestPart",
			})
			expect(result).to.be.ok()
			expect(result.uuid).to.equal("test-uuid")
			expect(result.className).to.equal("Part")
		end)

		it("should return nil for invalid data", function()
			local Deserializer = require(script.Parent.Parent.src.plugin.deserializer["instance-json"])
			local result = Deserializer.fromTable(nil)
			expect(result).to.equal(nil)
		end)
	end)
end

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EventAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddedBatchName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BatchName",
                table: "Tokens",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BatchName",
                table: "Tokens");
        }
    }
}

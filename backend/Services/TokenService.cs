using System.Security.Cryptography;
using System.Text;

namespace EventAPI.Services;

public class TokenService
{
    private const string Alphabet = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; 

    public static string GenerateUniqueCode()
    {
        var chars = new char[8];
        var data = new byte[8];
        
        using (var crypto = RandomNumberGenerator.Create())
        {
            crypto.GetBytes(data);
        }

        for (int i = 0; i < 8; i++)
        {
            // Map the random byte to our safe alphabet
            chars[i] = Alphabet[data[i] % Alphabet.Length];
        }

        // Format as XXXX-XXXX for easier reading/manual entry
        return $"{new string(chars, 0, 4)}-{new string(chars, 4, 4)}";
    }
}
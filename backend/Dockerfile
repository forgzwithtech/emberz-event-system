# 1. Use the .NET 8 SDK to build the app
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy the project file and restore dependencies
# Note: If your .csproj has a different name, it will still be picked up by the *.csproj wildcard
COPY *.csproj ./
RUN dotnet restore

# Copy the rest of the backend code and build the release
COPY . ./
RUN dotnet publish -c Release -o /app/publish

# 2. Use the lighter ASP.NET runtime for production
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# Render dynamically assigns a port, but defaults to 8080 for web services
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

# IMPORTANT: Change "EventAPI.dll" to match the actual name of your .csproj file
ENTRYPOINT ["dotnet", "EventAPI.dll"]
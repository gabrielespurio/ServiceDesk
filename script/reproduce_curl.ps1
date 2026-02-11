$loginUrl = "http://localhost:5001/api/auth/login"
$teamUrl = "http://localhost:5001/api/teams"

$bodyLogin = @{
    username = "admin"
    password = "password123"
} | ConvertTo-Json

echo "Logging in..."
$response = Invoke-RestMethod -Uri $loginUrl -Method Post -Body $bodyLogin -ContentType "application/json" -SessionVariable sess
echo "Logged in."

$bodyTeam = @{
    name          = "Curl Test Team"
    description   = "Created via curl"
    memberUserIds = @(1)
} | ConvertTo-Json

echo "Creating team..."
try {
    $response = Invoke-RestMethod -Uri $teamUrl -Method Post -Body $bodyTeam -ContentType "application/json" -WebSession $sess
    echo "Team created successfully."
    $response
}
catch {
    echo "Error creating team:"
    $_.Exception.Response.StatusCode
    $_.Exception.Response.StatusDescription
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    $reader.ReadToEnd()
}

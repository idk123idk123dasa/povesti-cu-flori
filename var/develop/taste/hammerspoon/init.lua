-- Luna cu Hamerspoon
-- Fisierele trebuie numite dupa tasta: t.wav, a.wav, 1.wav etc.
-- Pune fisierele in: ~/.hammerspoon/sounds/
-- Cmd+Alt+R  = reincarcare sunete
-- Cmd+Alt+S  = selector sunete
-- Cmd+Alt+↑  = volum mai tare
-- Cmd+Alt+↓  = volum mai incet

local SOUNDS_DIR = os.getenv("HOME") .. "/.hammerspoon/sounds/"
local EXTENSIONS = {mp3=true, wav=true, aiff=true, aif=true, m4a=true}

local soundMap = {}  -- char → {name, path, sound}
local enabled  = true
local volume   = 1.0

-- ── Volum ─────────────────────────────────────────────────────────────────────

local VOLUME_STEPS = {0.1, 0.25, 0.5, 0.75, 1.0}

local function volumeBar(v)
    local blocks = math.floor(v * 10 + 0.5)
    return string.rep("█", blocks) .. string.rep("░", 10 - blocks)
end

local function setVolume(v)
    volume = math.max(0.0, math.min(1.0, v))
    for _, entry in pairs(soundMap) do
        entry.sound:volume(volume)
    end
    hs.alert.show(string.format("🔊 %d%%  %s", math.floor(volume * 100), volumeBar(volume)))
end

local function changeVolume(delta)
    setVolume(volume + delta)
end

-- ── Incarcare sunete ──────────────────────────────────────────────────────────

local function loadSounds()
    soundMap = {}
    hs.execute("mkdir -p " .. SOUNDS_DIR)

    local files = hs.execute("ls -1 " .. SOUNDS_DIR .. " 2>/dev/null")
    local count = 0
    for filename in files:gmatch("[^\n]+") do
        local ext = filename:match("%.([^.]+)$")
        if ext and EXTENSIONS[ext:lower()] then
            local key = filename:gsub("%.[^.]+$", ""):lower()
            local path = SOUNDS_DIR .. filename
            local s = hs.sound.getByFile(path)
            if s then
                s:volume(volume)
                soundMap[key] = { name=key, path=path, sound=s }
                count = count + 1
            end
        end
    end

    if count > 0 then
        hs.alert.show("🌙 Luna: " .. count .. " sunet" .. (count == 1 and "" or "e") .. " incarcate")
    else
        hs.alert.show("🌙 Luna: niciun sunet in\n" .. SOUNDS_DIR)
    end
end

-- ── Event tap ─────────────────────────────────────────────────────────────────

local tap = hs.eventtap.new({ hs.eventtap.event.types.keyDown }, function(event)
    if not enabled then return false end
    local flags = event:getFlags()
    if flags.cmd or flags.ctrl then return false end

    local char = event:getCharacters(true)
    if char and char ~= "" then
        local entry = soundMap[char:lower()]
        if entry then
            entry.sound:volume(volume)
            entry.sound:stop()
            entry.sound:play()
        end
    end
    return false
end)

tap:start()

-- ── Selector de sunete ────────────────────────────────────────────────────────

local function openChooser()
    local list = {}
    for k, entry in pairs(soundMap) do
        table.insert(list, { text=entry.name, subText=entry.path, key=k })
    end
    table.sort(list, function(a, b) return a.text < b.text end)

    if #list == 0 then
        hs.alert.show("Niciun sunet gasit in\n" .. SOUNDS_DIR)
        return
    end

    local chooser = hs.chooser.new(function(choice)
        if choice then
            local e = soundMap[choice.key]
            if e then e.sound:volume(volume); e.sound:stop(); e.sound:play() end
        end
    end)
    chooser:choices(list)
    chooser:placeholderText("Cauta sau asculta un sunet...")
    chooser:searchSubText(true)
    chooser:show()
end

-- ── Meniu bar ─────────────────────────────────────────────────────────────────

local menuBar = hs.menubar.new()
if menuBar then
    menuBar:setTitle("🌙")
    menuBar:setTooltip("Luna cu Hamerspoon")
    menuBar:setMenu(function()
        local volItems = {}
        for _, v in ipairs(VOLUME_STEPS) do
            local pct = math.floor(v * 100)
            local check = (math.abs(volume - v) < 0.01) and "✓ " or "   "
            table.insert(volItems, {
                title = check .. pct .. "%",
                fn = function() setVolume(v) end
            })
        end
        local count = 0
        for _ in pairs(soundMap) do count = count + 1 end
        return {
            { title = enabled and "✓ Sunete active" or "✗ Sunete oprite", fn = function()
                enabled = not enabled
                menuBar:setTitle(enabled and "🌙" or "🌑")
            end },
            { title = "-" },
            { title = "🔊 Volum: " .. math.floor(volume * 100) .. "%", disabled = true },
            table.unpack(volItems),
            { title = "-" },
            { title = "🎵 Alege sunet   (Cmd+Alt+S)", fn = openChooser },
            { title = "🔄 Reincarcare   (Cmd+Alt+R)", fn = loadSounds },
            { title = "-" },
            { title = "📁 Deschide folderul cu sunete", fn = function()
                hs.execute("open " .. SOUNDS_DIR)
            end },
            { title = "-" },
            { title = count .. " sunet" .. (count == 1 and "" or "e") .. " incarcate", disabled = true },
        }
    end)
end

-- ── Hotkeys ───────────────────────────────────────────────────────────────────

hs.hotkey.bind({"cmd","alt"}, "R",    loadSounds)
hs.hotkey.bind({"cmd","alt"}, "S",    openChooser)
hs.hotkey.bind({"cmd","alt"}, "up",   function() changeVolume(0.1)  end)
hs.hotkey.bind({"cmd","alt"}, "down", function() changeVolume(-0.1) end)

-- ── Start ─────────────────────────────────────────────────────────────────────

loadSounds()

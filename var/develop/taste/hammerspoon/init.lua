-- Luna cu Hammerspoon + Stele pe bara de meniu
-- Pune fisierele .mp3 / .wav in: ~/.hammerspoon/sounds/
-- Cmd+Alt+R        = reincarcare sunete
-- Cmd+Alt+S        = selector sunete
-- Cmd+Alt+↑        = volum mai tare
-- Cmd+Alt+↓        = volum mai incet
-- Cmd+Alt+Ctrl+S   = toggle stele on/off
-- Cmd+Alt+Ctrl+R   = reload config

-- ═══════════════════════════════════════════════════════════════════
-- STELE PE BARA DE MENIU
-- ═══════════════════════════════════════════════════════════════════

local MENU_H    = 24
local NUM_STARS = 120
local FPS       = 30

local BG = { red = 0.02, green = 0.00, blue = 0.08, alpha = 1.0 }

local PALETA = {
  { r = 1.0, g = 1.0, b = 1.0 },
  { r = 0.7, g = 0.85, b = 1.0 },
  { r = 1.0, g = 0.9, b = 0.6 },
  { r = 0.6, g = 0.75, b = 1.0 },
  { r = 1.0, g = 0.7, b = 0.8 },
}

local starCanvas, starTimer, stele = nil, nil, {}

local function latimeEcran()
  return hs.screen.mainScreen():fullFrame().w
end

local function steaNoua(w, dinDreapta)
  local c = PALETA[math.random(#PALETA)]
  return {
    x      = dinDreapta and (w + math.random(10, w)) or math.random(0, w),
    y      = math.random(3, MENU_H - 4),
    raza   = math.random(4, 14) * 0.12,
    viteza = math.random(20, 90) * 0.05,
    alfa   = math.random(55, 100) / 100,
    faza   = math.random(0, 628) / 100,
    vFaza  = math.random(3, 18) * 0.01,
    c      = c,
  }
end

local function initStele()
  stele = {}
  local w = latimeEcran()
  for i = 1, NUM_STARS do
    table.insert(stele, steaNoua(w, false))
  end
end

local function construiesteFrame()
  local w = latimeEcran()
  local els = {}

  els[#els + 1] = {
    type      = "rectangle",
    action    = "fill",
    fillColor = BG,
    frame     = { x = 0, y = 0, w = w, h = MENU_H },
  }
  els[#els + 1] = {
    type      = "rectangle",
    action    = "fill",
    fillColor = { red = 0.05, green = 0.02, blue = 0.15, alpha = 0.4 },
    frame     = { x = 0, y = 0, w = w, h = 6 },
  }

  for i, s in ipairs(stele) do
    s.x = s.x - s.viteza
    if s.x < -3 then
      stele[i] = steaNoua(w, true)
      s = stele[i]
    end
    s.faza = s.faza + s.vFaza
    local clipire = (math.sin(s.faza) + 1) * 0.5
    local alfaCurent = s.alfa * (0.3 + 0.7 * clipire)

    els[#els + 1] = {
      type      = "circle",
      action    = "fill",
      fillColor = { red = s.c.r, green = s.c.g, blue = s.c.b, alpha = alfaCurent },
      center    = { x = s.x, y = s.y },
      radius    = s.raza,
    }
    if s.raza > 1.0 then
      els[#els + 1] = {
        type      = "circle",
        action    = "fill",
        fillColor = { red = s.c.r, green = s.c.g, blue = s.c.b, alpha = alfaCurent * 0.2 },
        center    = { x = s.x, y = s.y },
        radius    = s.raza * 2.5,
      }
    end
  end

  return els
end

local function pornestStele()
  pcall(function()
    if starCanvas then starCanvas:delete() end
    if starTimer  then starTimer:stop() end
    local w = latimeEcran()
    starCanvas = hs.canvas.new({ x = 0, y = 0, w = w, h = MENU_H })
    starCanvas:level(26)
    local beh = hs.canvas.windowBehaviors
    starCanvas:behavior(beh.canJoinAllSpaces | beh.stationary)
    starCanvas:_setWindowAndItsParentsEventMask(0)
    starCanvas:show()
    initStele()
    starTimer = hs.timer.doEvery(1 / FPS, function()
      if starCanvas then starCanvas:replaceElements(construiesteFrame()) end
    end)
  end)
end

local function opresteStele()
  if starTimer  then starTimer:stop();    starTimer  = nil end
  if starCanvas then starCanvas:delete(); starCanvas = nil end
end

hs.screen.watcher.new(pornestStele):start()
pornestStele()

-- ═══════════════════════════════════════════════════════════════════
-- LUNA – SUNETE PE TASTATURA
-- ═══════════════════════════════════════════════════════════════════

local SOUNDS_DIR = os.getenv("HOME") .. "/.hammerspoon/sounds/"
local EXTENSIONS = {mp3=true, wav=true, aiff=true, aif=true, m4a=true}

local pool    = {}
local keyMap  = {}
local enabled = true
local volume  = 1.0

local VOLUME_STEPS = {0.1, 0.25, 0.5, 0.75, 1.0}

local function volumeBar(v)
    local blocks = math.floor(v * 10 + 0.5)
    return string.rep("█", blocks) .. string.rep("░", 10 - blocks)
end

local function setVolume(v)
    volume = math.max(0.0, math.min(1.0, v))
    for _, entry in ipairs(pool) do entry.sound:volume(volume) end
    hs.alert.show(string.format("🔊 %d%%  %s", math.floor(volume * 100), volumeBar(volume)))
end

local function changeVolume(delta) setVolume(volume + delta) end

local function loadSounds()
    pool = {}
    keyMap = {}
    hs.execute("mkdir -p " .. SOUNDS_DIR)
    local files = hs.execute("ls -1 " .. SOUNDS_DIR .. " 2>/dev/null")
    for filename in files:gmatch("[^\n]+") do
        local ext = filename:match("%.([^.]+)$")
        if ext and EXTENSIONS[ext:lower()] then
            local path = SOUNDS_DIR .. filename
            local s = hs.sound.getByFile(path)
            if s then
                s:volume(volume)
                local name = filename:gsub("%.[^.]+$", "")
                table.insert(pool, { name=name, path=path, sound=s })
            end
        end
    end
    if #pool > 0 then
        hs.alert.show("🌙 Luna: " .. #pool .. " sunet" .. (#pool == 1 and "" or "e") .. " incarcate")
    else
        hs.alert.show("🌙 Luna: niciun sunet in " .. SOUNDS_DIR)
    end
end

local function soundForKeycode(keycode)
    if #pool == 0 then return nil end
    if not keyMap[keycode] then
        keyMap[keycode] = (keycode % #pool) + 1
    end
    return pool[keyMap[keycode]]
end

local tap = hs.eventtap.new({ hs.eventtap.event.types.keyDown }, function(event)
    if not enabled then return false end
    local flags = event:getFlags()
    if flags.cmd or flags.ctrl then return false end
    local entry = soundForKeycode(event:getKeyCode())
    if entry then
        entry.sound:volume(volume)
        entry.sound:stop()
        entry.sound:play()
    end
    return false
end)
tap:start()

local function openChooser()
    if #pool == 0 then
        hs.alert.show("Niciun sunet gasit in " .. SOUNDS_DIR)
        return
    end
    local choices = {}
    for i, entry in ipairs(pool) do
        table.insert(choices, { text=entry.name, subText=entry.path, idx=i })
    end
    local chooser = hs.chooser.new(function(choice)
        if choice then
            local s = pool[choice.idx]
            if s then s.sound:volume(volume); s.sound:stop(); s.sound:play() end
        end
    end)
    chooser:choices(choices)
    chooser:placeholderText("Cauta sau asculta un sunet...")
    chooser:searchSubText(true)
    chooser:show()
end

-- ── Meniu bar ─────────────────────────────────────────────────────────────────

local menuBar = hs.menubar.new()
if menuBar then
    menuBar:setTitle("🌙")
    menuBar:setTooltip("Luna + Stele")
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
        return {
            { title = enabled and "✓ Sunete active" or "✗ Sunete oprite", fn = function()
                enabled = not enabled
                menuBar:setTitle(enabled and "🌙" or "🌑")
            end },
            { title = starCanvas and "✦ Stele active" or "✧ Stele oprite", fn = function()
                if starCanvas then opresteStele() else pornestStele() end
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
            { title = #pool .. " sunet" .. (#pool == 1 and "" or "e") .. " incarcate", disabled = true },
        }
    end)
end

-- ── Hotkeys ───────────────────────────────────────────────────────────────────

hs.hotkey.bind({"cmd","alt"},         "R",    loadSounds)
hs.hotkey.bind({"cmd","alt"},         "S",    openChooser)
hs.hotkey.bind({"cmd","alt"},         "up",   function() changeVolume(0.1)  end)
hs.hotkey.bind({"cmd","alt"},         "down", function() changeVolume(-0.1) end)
hs.hotkey.bind({"cmd","alt","ctrl"},  "S",    function()
    if starCanvas then opresteStele(); hs.alert.show("Stele oprite")
    else pornestStele(); hs.alert.show("Stele pornite ✦") end
end)
hs.hotkey.bind({"cmd","alt","ctrl"},  "R",    hs.reload)

-- ── Start ─────────────────────────────────────────────────────────────────────

loadSounds()

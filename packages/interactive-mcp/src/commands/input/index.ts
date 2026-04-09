import { spawnSync } from 'child_process';
import os from 'os';
import { USER_INPUT_TIMEOUT_SECONDS } from '@/constants.js';
import logger from '../../utils/logger.js';

// ─── Linux: GTK open-ended text area ─────────────────────────────────────────

const GTK_TEXT_DIALOG = `
import gi, sys
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, Gdk, GLib

title    = sys.argv[1]
question = sys.argv[2]
timeout  = int(sys.argv[3]) if len(sys.argv) > 3 else 120

css = Gtk.CssProvider()
css.load_from_data(b"textview, textview text { background-color: #ffffff; color: #1a1a1a; } textview { border: 1px solid #aaa; border-radius: 4px; }")
Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)

win = Gtk.Dialog(title=title, flags=0)
win.add_buttons('Cancelar', Gtk.ResponseType.CANCEL, 'OK', Gtk.ResponseType.OK)
win.set_default_response(Gtk.ResponseType.OK)
win.set_default_size(600, 420)
win.set_resizable(True)

box = win.get_content_area()
box.set_spacing(8)
box.set_margin_start(12)
box.set_margin_end(12)
box.set_margin_top(12)
box.set_margin_bottom(12)

label = Gtk.Label(label=question)
label.set_line_wrap(True)
label.set_line_wrap_mode(2)
label.set_xalign(0)
label.set_max_width_chars(72)
box.add(label)

scroll = Gtk.ScrolledWindow()
scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
scroll.set_min_content_height(160)
scroll.set_vexpand(True)

textview = Gtk.TextView()
textview.set_wrap_mode(Gtk.WrapMode.WORD_CHAR)
textview.set_left_margin(6)
textview.set_right_margin(6)
textview.set_top_margin(6)
textview.set_bottom_margin(6)
scroll.add(textview)
box.pack_start(scroll, True, True, 0)

remaining = [timeout]

def fmt(s):
    return f"{s // 60}:{s % 60:02d}"

countdown_label = Gtk.Label()
countdown_label.set_markup(f'<span foreground="#888888" size="small">Tempo restante: {fmt(timeout)}</span>')
countdown_label.set_xalign(1)
box.add(countdown_label)

def tick():
    remaining[0] -= 1
    if remaining[0] <= 0:
        win.response(Gtk.ResponseType.CANCEL)
        return False
    color = "#e53935" if remaining[0] <= 30 else "#888888"
    countdown_label.set_markup(f'<span foreground="{color}" size="small">Tempo restante: {fmt(remaining[0])}</span>')
    return True

GLib.timeout_add_seconds(1, tick)

win.show_all()
textview.grab_focus()
response = win.run()

if response == Gtk.ResponseType.OK:
    buf = textview.get_buffer()
    text = buf.get_text(buf.get_start_iter(), buf.get_end_iter(), True).strip()
    print(text, end='')
    sys.exit(0)

sys.exit(5)
`;

// ─── Linux: GTK radio list + "Outro" with expandable text area ───────────────

const GTK_RADIO_DIALOG = `
import gi, sys, json
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, Gdk, GLib

css = Gtk.CssProvider()
css.load_from_data(b"textview, textview text { background-color: #ffffff; color: #1a1a1a; } textview { border: 1px solid #aaa; border-radius: 4px; }")
Gtk.StyleContext.add_provider_for_screen(Gdk.Screen.get_default(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION)

title    = sys.argv[1]
question = sys.argv[2]
timeout  = int(sys.argv[3]) if len(sys.argv) > 3 else 120
options  = json.loads(sys.argv[4])

if 'Outro' not in options:
    options = options + ['Outro']

win = Gtk.Dialog(title=title, flags=0)
win.add_buttons('Cancelar', Gtk.ResponseType.CANCEL, 'OK', Gtk.ResponseType.OK)
win.set_default_response(Gtk.ResponseType.OK)
win.set_default_size(520, 460)
win.set_resizable(True)

box = win.get_content_area()
box.set_spacing(6)
box.set_margin_start(12)
box.set_margin_end(12)
box.set_margin_top(12)
box.set_margin_bottom(12)

label = Gtk.Label(label=question)
label.set_line_wrap(True)
label.set_line_wrap_mode(2)
label.set_xalign(0)
label.set_max_width_chars(68)
box.add(label)

sep = Gtk.Separator(orientation=Gtk.Orientation.HORIZONTAL)
box.add(sep)

# Radio buttons
radios = []
group = None
for opt in options:
    rb = Gtk.RadioButton.new_with_label_from_widget(group, opt)
    if group is None:
        group = rb
    radios.append(rb)
    box.add(rb)

# "Outro" text area (initially hidden)
scroll = Gtk.ScrolledWindow()
scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
scroll.set_min_content_height(100)
scroll.set_vexpand(True)
scroll.set_no_show_all(True)

textview = Gtk.TextView()
textview.set_wrap_mode(Gtk.WrapMode.WORD_CHAR)
textview.set_left_margin(6)
textview.set_right_margin(6)
textview.set_top_margin(6)
textview.set_bottom_margin(6)
scroll.add(textview)
box.pack_start(scroll, True, True, 0)

outro_radio = radios[-1]

def on_radio_toggled(rb):
    if outro_radio.get_active():
        scroll.show()
        textview.grab_focus()
    else:
        scroll.hide()
        win.resize(520, 460)

for rb in radios:
    rb.connect('toggled', on_radio_toggled)

remaining = [timeout]

def fmt(s):
    return f"{s // 60}:{s % 60:02d}"

countdown_label = Gtk.Label()
countdown_label.set_markup(f'<span foreground="#888888" size="small">Tempo restante: {fmt(timeout)}</span>')
countdown_label.set_xalign(1)
box.add(countdown_label)

def tick():
    remaining[0] -= 1
    if remaining[0] <= 0:
        win.response(Gtk.ResponseType.CANCEL)
        return False
    color = "#e53935" if remaining[0] <= 30 else "#888888"
    countdown_label.set_markup(f'<span foreground="{color}" size="small">Tempo restante: {fmt(remaining[0])}</span>')
    return True

GLib.timeout_add_seconds(1, tick)

radios[0].set_active(True)
win.show_all()
scroll.hide()
response = win.run()

if response == Gtk.ResponseType.OK:
    if outro_radio.get_active():
        buf = textview.get_buffer()
        text = buf.get_text(buf.get_start_iter(), buf.get_end_iter(), True).strip()
        print(text, end='')
    else:
        for rb in radios:
            if rb.get_active():
                print(rb.get_label(), end='')
                break
    sys.exit(0)

sys.exit(5)
`;

function getInputViaGtkTextDialog(
  projectName: string,
  promptMessage: string,
  timeoutSeconds: number,
): string {
  const result = spawnSync(
    'python3',
    ['-c', GTK_TEXT_DIALOG, projectName, promptMessage, String(timeoutSeconds)],
    { encoding: 'utf8' },
  );

  if (result.status === 0) return result.stdout;
  if (result.status === 5) return '__TIMEOUT__';

  logger.info(`GTK text dialog: cancelled (status ${result.status})`);
  return '';
}

function getInputViaGtkRadioDialog(
  projectName: string,
  promptMessage: string,
  timeoutSeconds: number,
  predefinedOptions: string[],
): string {
  const result = spawnSync(
    'python3',
    [
      '-c',
      GTK_RADIO_DIALOG,
      projectName,
      promptMessage,
      String(timeoutSeconds),
      JSON.stringify(predefinedOptions),
    ],
    { encoding: 'utf8' },
  );

  if (result.status === 0) return result.stdout;
  if (result.status === 5) return '__TIMEOUT__';

  logger.info(`GTK radio dialog: cancelled (status ${result.status})`);
  return '';
}

// ─── macOS: osascript dialog ─────────────────────────────────────────────────

function getInputViaOsascript(
  projectName: string,
  promptMessage: string,
  timeoutSeconds: number,
  predefinedOptions?: string[],
): string {
  let script: string;

  if (predefinedOptions && predefinedOptions.length > 0) {
    const allOptions = predefinedOptions.includes('Outro')
      ? predefinedOptions
      : [...predefinedOptions, 'Outro'];
    const optionsList = allOptions
      .map((o) => `"${o.replace(/"/g, '\\"')}"`)
      .join(', ');
    script = `choose from list {${optionsList}} with title "${projectName}" with prompt "${promptMessage}" default items {"${allOptions[0]}"}`;
  } else {
    script = `display dialog "${promptMessage}" with title "${projectName}" default answer "" giving up after ${timeoutSeconds}`;
  }

  const result = spawnSync('osascript', ['-e', script], { encoding: 'utf8' });
  if (result.status !== 0) return '';

  const output = result.stdout.trim();
  const textMatch = output.match(/text returned:(.*)/);
  if (textMatch) return textMatch[1].trim();
  if (output === 'false') return '';
  return output;
}

// ─── Windows: PowerShell dialog ──────────────────────────────────────────────

function getInputViaPowerShell(
  projectName: string,
  promptMessage: string,
): string {
  const script = [
    'Add-Type -AssemblyName Microsoft.VisualBasic',
    `$r = [Microsoft.VisualBasic.Interaction]::InputBox("${promptMessage}", "${projectName}", "")`,
    'Write-Output $r',
  ].join('; ');

  const result = spawnSync('powershell', ['-Command', script], {
    encoding: 'utf8',
  });

  if (result.status !== 0) return '';
  return result.stdout.trim();
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getCmdWindowInput(
  projectName: string,
  promptMessage: string,
  timeoutSeconds: number = USER_INPUT_TIMEOUT_SECONDS,
  _showCountdown: boolean = true,
  predefinedOptions?: string[],
): Promise<string> {
  const platform = os.platform();

  if (platform === 'linux') {
    if (predefinedOptions && predefinedOptions.length > 0) {
      return getInputViaGtkRadioDialog(
        projectName,
        promptMessage,
        timeoutSeconds,
        predefinedOptions,
      );
    }
    return getInputViaGtkTextDialog(projectName, promptMessage, timeoutSeconds);
  }

  if (platform === 'darwin') {
    return getInputViaOsascript(
      projectName,
      promptMessage,
      timeoutSeconds,
      predefinedOptions,
    );
  }

  return getInputViaPowerShell(projectName, promptMessage);
}

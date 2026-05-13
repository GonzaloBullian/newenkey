#include <stdio.h>
#include <ApplicationServices/ApplicationServices.h>

CGEventRef callback(CGEventTapProxy proxy, CGEventType type, CGEventRef event, void *refcon) {
    if (type == kCGEventKeyDown) {
        CGKeyCode keyCode = (CGKeyCode)CGEventGetIntegerValueField(event, kCGKeyboardEventKeycode);
        UniChar chars[4];
        UniCharCount len = 0;
        CGEventKeyboardGetUnicodeString(event, 4, &len, chars);
        char ch[16] = "";
        if (len > 0 && chars[0] >= 32 && chars[0] < 127) {
            snprintf(ch, sizeof(ch), "%c", (char)chars[0]);
        }
        printf("{\"k\":%d,\"c\":\"%s\"}\n", keyCode, ch);
        fflush(stdout);
    }
    return event;
}

int main() {
    CGEventMask mask = CGEventMaskBit(kCGEventKeyDown);
    CFMachPortRef tap = CGEventTapCreate(kCGSessionEventTap, kCGHeadInsertEventTap,
        kCGEventTapOptionListenOnly, mask, callback, NULL);
    if (!tap) { fprintf(stderr, "no_permission\n"); return 1; }
    CFRunLoopSourceRef src = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0);
    CFRunLoopAddSource(CFRunLoopGetCurrent(), src, kCFRunLoopCommonModes);
    CGEventTapEnable(tap, true);
    fprintf(stderr, "listening\n"); fflush(stderr);
    CFRunLoopRun();
    return 0;
}

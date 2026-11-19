# ProGuard rules for SupremeAI Studio
-keepattributes *Annotation*
-keepclassmembers class * {
    @kotlinx.serialization.Serializable <init>(...);
}

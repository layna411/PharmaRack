package com.simats.PharmaRack.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme = darkColorScheme(
    primary = PharmaBluePrimary,
    secondary = PharmaCyanAccent,
    tertiary = PharmaTeal,
    background = PharmaNavyDark,
    surface = PharmaNavyDark,
    onPrimary = Color.White
)

private val LightColorScheme = lightColorScheme(
    primary = PharmaBluePrimary,
    secondary = PharmaCyanAccent,
    tertiary = PharmaTeal,
    background = BackgroundIce,
    surface = Color.White,
    onPrimary = Color.White,
    onSecondary = PharmaNavyDark,
    onBackground = TextPrimarySlate,
    onSurface = TextPrimarySlate
)

@Composable
fun PharmaRackTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    dynamicColor: Boolean = false,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }

        darkTheme -> DarkColorScheme
        else -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
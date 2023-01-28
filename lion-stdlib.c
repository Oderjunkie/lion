#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>

int16_t zp(int16_t lhs, int16_t rhs) { return lhs + rhs; }
int16_t zm(int16_t lhs, int16_t rhs) { return lhs - rhs; }
int16_t zt(int16_t lhs, int16_t rhs) { return lhs * rhs; }
int16_t zs(int16_t lhs, int16_t rhs) { return lhs / rhs; }
int16_t zv(int16_t lhs, int16_t rhs) { return lhs % rhs; }
bool zl(int16_t lhs, int16_t rhs) { return lhs < rhs; }
bool ze(int16_t lhs, int16_t rhs) { return lhs == rhs; }
bool zg(int16_t lhs, int16_t rhs) { return lhs > rhs; }
bool zlze(int16_t lhs, int16_t rhs) { return lhs <= rhs; }
bool znze(int16_t lhs, int16_t rhs) { return lhs != rhs; }
bool zgze(int16_t lhs, int16_t rhs) { return lhs >= rhs; }